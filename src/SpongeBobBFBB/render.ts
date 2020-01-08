
// @ts-ignore
import program_glsl from './program.glsl';
import * as rw from 'librw';
import * as UI from "../ui";
import * as Viewer from '../viewer';
import * as Assets from './assets';
import { GfxDevice, GfxRenderPass, GfxBuffer, GfxInputLayout, GfxInputState, GfxMegaStateDescriptor, GfxProgram, GfxBufferUsage, GfxVertexAttributeDescriptor, GfxFormat, GfxInputLayoutBufferDescriptor, GfxVertexBufferFrequency, GfxVertexBufferDescriptor, GfxIndexBufferDescriptor, GfxCullMode, GfxBlendMode, GfxBlendFactor, GfxBindingLayoutDescriptor, GfxHostAccessPass, GfxTexture, GfxSampler, makeTextureDescriptor2D, GfxTexFilterMode, GfxMipFilterMode, GfxWrapMode, GfxCompareMode } from '../gfx/platform/GfxPlatform';
import { MeshFragData, Texture, rwTexture } from '../GrandTheftAuto3/render';
import { vec3, vec2, mat4, quat } from 'gl-matrix';
import { colorNewCopy, White, colorNew, Color, colorCopy, TransparentBlack } from '../Color';
import { filterDegenerateTriangleIndexBuffer, convertToTriangleIndexBuffer, GfxTopology } from '../gfx/helpers/TopologyHelpers';
import { DeviceProgram } from '../Program';
import { GfxRenderInstManager, setSortKeyDepth, GfxRendererLayer, makeSortKey } from '../gfx/render/GfxRenderer';
import { AABB, squaredDistanceFromPointToAABB } from '../Geometry';
import { assert, nArray } from '../util';
import { GfxRenderHelper } from '../gfx/render/GfxRenderGraph';
import { FPSCameraController, computeViewSpaceDepthFromWorldSpaceAABB } from '../Camera';
import { fillColor, fillMatrix4x4, fillMatrix4x3, fillVec4 } from '../gfx/helpers/UniformBufferHelpers';
import { makeStaticDataBuffer } from '../gfx/helpers/BufferHelpers';
import { setAttachmentStateSimple } from '../gfx/helpers/GfxMegaStateDescriptorHelpers';
import { BasicRenderTarget, depthClearRenderPassDescriptor, makeClearRenderPassDescriptor } from '../gfx/helpers/RenderTargetHelpers';
import { TextureMapping } from '../TextureHolder';
import { RWAtomicStruct, RWChunk, parseRWAtomic, RWAtomicFlags, quatFromYPR, DataCache, DataStream } from './util';
import { EventID, BaseType } from './enums';
import { reverseDepthForCompareMode } from '../gfx/helpers/ReversedDepthHelpers';
import { MathConstants } from '../MathHelpers';
import { Asset } from './hip';

const bindingLayouts: GfxBindingLayoutDescriptor[] = [
    { numUniformBuffers: 3, numSamplers: 1 },
];

const MAX_DRAW_DISTANCE = 1000.0;

interface BFBBProgramDef {
    PLAYER?: string;
    ENT?: string;
    SKY?: string;
    SKY_DEPTH?: string;
    USE_TEXTURE?: string;
    USE_LIGHTING?: string;
    USE_FOG?: string;
    ALPHA_REF?: string;
}

class BFBBProgram extends DeviceProgram {
    public static a_Position = 0;
    public static a_Normal = 1;
    public static a_Color = 2;
    public static a_TexCoord = 3;

    public static ub_SceneParams = 0;
    public static ub_ModelParams = 1;
    public static ub_EntParams = 2;

    public both = program_glsl;

    constructor(def: BFBBProgramDef = {}) {
        super();
        if (def.PLAYER)
            this.defines.set('PLAYER', def.PLAYER);
        if (def.ENT)
            this.defines.set('ENT', def.ENT);
        if (def.SKY)
            this.defines.set('SKY', def.SKY);
        if (def.SKY_DEPTH)
            this.defines.set('SKY_DEPTH', def.SKY_DEPTH);
        if (def.USE_TEXTURE)
            this.defines.set('USE_TEXTURE', def.USE_TEXTURE);
        if (def.USE_LIGHTING)
            this.defines.set('USE_LIGHTING', def.USE_LIGHTING);
        if (def.USE_FOG)
            this.defines.set('USE_FOG', def.USE_FOG);
        if (def.ALPHA_REF)
            this.defines.set('ALPHA_REF', def.ALPHA_REF);
    }
}

export class AssetCache extends DataCache<Asset> {
    public addAsset(asset: Asset, sceneid: string) {
        this.add(asset, sceneid, asset.id, asset.name);
    }
}

export class TextureData {
    private gfxTexture?: GfxTexture;
    private gfxSampler?: GfxSampler;
    private gfxDevice?: GfxDevice;

    public textureMapping = nArray(1, () => new TextureMapping());

    private isSetup = false;

    constructor(public texture: Texture, public name: string, public filter: GfxTexFilterMode, public wrapS: GfxWrapMode, public wrapT: GfxWrapMode) {}

    public setup(device: GfxDevice) {
        if (this.isSetup) return;

        this.gfxDevice = device;

        this.gfxTexture = device.createTexture(makeTextureDescriptor2D(this.texture.pixelFormat, this.texture.width, this.texture.height, 1));
        const hostAccessPass = device.createHostAccessPass();
        hostAccessPass.uploadTextureData(this.gfxTexture, 0, [this.texture.levels[0]]);
        device.submitPass(hostAccessPass);

        this.gfxSampler = device.createSampler({
            magFilter: this.filter,
            minFilter: this.filter,
            mipFilter: GfxMipFilterMode.NO_MIP,
            minLOD: 0,
            maxLOD: 1000,
            wrapS: this.wrapS,
            wrapT: this.wrapT,
        });

        const mapping = this.textureMapping[0];
        mapping.width = this.texture.width;
        mapping.height = this.texture.height;
        mapping.flipY = false;
        mapping.gfxTexture = this.gfxTexture;
        mapping.gfxSampler = this.gfxSampler;

        this.isSetup = true;
    }

    public destroy(): void {
        if (this.gfxDevice) {
            if (this.gfxTexture)
                this.gfxDevice.destroyTexture(this.gfxTexture);
            if (this.gfxSampler)
                this.gfxDevice.destroySampler(this.gfxSampler);
        }
        
        this.isSetup = false;
    }
}

function convertFilterMode(filter: number): GfxTexFilterMode {
    return GfxTexFilterMode.BILINEAR;
}

function convertWrapMode(addressing: number): GfxWrapMode {
    switch (addressing) {
        case rw.Texture.Addressing.MIRROR:
            return GfxWrapMode.MIRROR;
        case rw.Texture.Addressing.WRAP:
            return GfxWrapMode.REPEAT;
        case rw.Texture.Addressing.CLAMP:
        case rw.Texture.Addressing.BORDER:
        default:
            return GfxWrapMode.CLAMP;
    }
}

export class TextureCache extends DataCache<TextureData> {
    public addTexDictionary(texdic: rw.TexDictionary, sceneid: string, id: number, name: string) {
        // Only add the first texture (Each texture in BFBB is a separate texdic)
        const rwtx = rw.Texture.fromDict(texdic.textures.begin);
        const filter = convertFilterMode(rwtx.filter);
        const wrapS = convertWrapMode(rwtx.addressU);
        const wrapT = convertWrapMode(rwtx.addressV);
        const texture = rwTexture(rwtx, name, false);
        const textureData = new TextureData(texture, name, filter, wrapS, wrapT);

        const onremove = () => {
            textureData.destroy();
        };

        this.add(textureData, sceneid, id, name, onremove);
    }
}

// Convert a RW texture name to BFBB's expected format for texture names
export function textureNameRW3(name: string) {
    return name + '.RW3';
}

function textureHasTransparentPixels(texture: Texture) {
    assert(texture.pixelFormat === GfxFormat.U8_RGBA_NORM ||
        texture.pixelFormat === GfxFormat.U8_RGB_NORM);
    
    if (texture.pixelFormat === GfxFormat.U8_RGB_NORM)
        return false;

    const level = texture.levels[0];
    for (let i = 0; i < level.length; i += 4) {
        if (level[i+3] < 255)
            return true;
    }
    
    return false;
}

class RWMeshFragData implements MeshFragData {
    public indices: Uint16Array;
    public textureData?: TextureData;
    public transparentColors: boolean;
    public transparentTexture: boolean;

    private baseColor = colorNewCopy(White);
    private indexMap: number[];

    constructor(mesh: rw.Mesh, tristrip: boolean, private positions: Float32Array, private normals: Float32Array | null,
        private texCoords: Float32Array | null, private colors: Uint8Array | null, textures?: TextureData[]) {

        const { texture, color } = mesh.material;

        if (texture && textures) {
            for (const textureData of textures) {
                if (textureData.name === textureNameRW3(texture.name)) {
                    this.textureData = textureData;
                    break;
                }
            }
        }

        if (color)
            this.baseColor = colorNew(color[0] / 0xFF, color[1] / 0xFF, color[2] / 0xFF, color[3] / 0xFF);

        this.transparentColors = false;
        this.transparentTexture = false;

        if (this.textureData && (textureHasTransparentPixels(this.textureData.texture) || this.textureData.name.startsWith('shadow')) /* meh */)
            this.transparentTexture = true;
        
        if (color && color[3] < 0xFF)
            this.transparentColors = true;
        else if (this.colors) {
            for (let i = 0; i < this.colors.length; i += 4) {
                if (this.colors[i+3] < 0xFF) {
                    this.transparentColors = true;
                    break;
                }
            }
        }

        this.indexMap = Array.from(new Set(mesh.indices)).sort();

        this.indices = filterDegenerateTriangleIndexBuffer(convertToTriangleIndexBuffer(
            tristrip ? GfxTopology.TRISTRIP : GfxTopology.TRIANGLES,
            mesh.indices!.map(index => this.indexMap.indexOf(index))));
    }

    public get vertices() {
        return this.indexMap.length;
    }

    public distanceToCamera(cameraPosition: vec3, modelMatrix: mat4): number {
        let minDist = Infinity;
        const m = modelMatrix;
        for (let i = 0; i < this.positions.length; i += 3) {
            const vx = this.positions[i+0];
            const vy = this.positions[i+1];
            const vz = this.positions[i+2];
            const x = m[0] * vx + m[4] * vy + m[8] * vz + m[12];
            const y = m[1] * vx + m[5] * vy + m[9] * vz + m[13];
            const z = m[2] * vx + m[6] * vy + m[10] * vz + m[14];
            const dx = cameraPosition[0] - x;
            const dy = cameraPosition[1] - y;
            const dz = cameraPosition[2] - z;
            const dist = dx*dx + dy*dy + dz*dz;
            minDist = Math.min(dist, minDist);
        }
        return Math.sqrt(minDist);
    }

    public fillPosition(dst: vec3, index: number): void {
        const i = this.indexMap[index];
        dst[0] = this.positions[3*i+0];
        dst[1] = this.positions[3*i+1];
        dst[2] = this.positions[3*i+2];
    }

    public fillNormal(dst: vec3, index: number): void {
        const i = this.indexMap[index];
        if (this.normals !== null) {
            dst[0] = this.normals[3*i+0];
            dst[1] = this.normals[3*i+1];
            dst[2] = this.normals[3*i+2];
        }
    }

    public fillColor(dst: Color, index: number): void {
        const i = this.indexMap[index];
        colorCopy(dst, this.baseColor);
        if (this.colors !== null) {
            const r = this.colors[4*i+0]/0xFF;
            const g = this.colors[4*i+1]/0xFF;
            const b = this.colors[4*i+2]/0xFF;
            const a = this.colors[4*i+3]/0xFF;
            dst.r *= r;
            dst.g *= g;
            dst.b *= b;
            dst.a *= a;
        }
    }

    public fillTexCoord(dst: vec2, index: number): void {
        const i = this.indexMap[index];
        if (this.texCoords !== null) {
            dst[0] = this.texCoords[2*i+0];
            dst[1] = this.texCoords[2*i+1];
        }
    }
}

export interface AtomicData {
    meshes: RWMeshFragData[];
    visible: boolean;
}

export interface ClumpData {
    atomics: AtomicData[];
    pipeInfo?: Assets.PipeInfo;
}

export class ModelCache extends DataCache<ClumpData> {
    private currentClumpBeingAdded: ClumpData | undefined;

    private addAtomic(atomic: rw.Atomic, atomicStruct: RWAtomicStruct, textures?: TextureData[]) {
        const geom = atomic.geometry;
        const positions = geom.morphTarget(0).vertices!.slice();
        const normals = (geom.morphTarget(0).normals) ? geom.morphTarget(0).normals!.slice() : null;
        const texCoords = (geom.numTexCoordSets) ? geom.texCoords(0)!.slice() : null;
        const colors = (geom.colors) ? geom.colors.slice() : null;
        const meshHeader = geom.meshHeader;

        const meshes: RWMeshFragData[] = [];

        for (let i = 0; i < meshHeader.numMeshes; i++)
            meshes.push(new RWMeshFragData(meshHeader.mesh(i), meshHeader.tristrip, positions, normals, texCoords, colors, textures));

        const visible = (atomicStruct.flags & RWAtomicFlags.Render) !== 0;

        this.currentClumpBeingAdded!.atomics.push({ meshes, visible });
    }

    public addClump(chunk: RWChunk, clump: rw.Clump, sceneid: string, id: number, name: string, textures?: TextureData[]) {
        for (let i = 0, lnk = clump.atomics.begin; i < chunk.children.length && !lnk.is(clump.atomics.end); lnk = lnk.next) {
            const atomic = rw.Atomic.fromClump(lnk);

            let atomicChunk: RWChunk;
            do { atomicChunk = chunk.children[i++]; } while (atomicChunk.header.type !== rw.PluginID.ID_ATOMIC);
            const structChunk = atomicChunk.children[0];
            assert(structChunk.header.type === rw.PluginID.ID_STRUCT);

            const atomicStruct = parseRWAtomic(structChunk);

            this.currentClumpBeingAdded = this.getByID(id);
            if (!this.currentClumpBeingAdded) {
                this.currentClumpBeingAdded = { atomics: [] };
                this.add(this.currentClumpBeingAdded, sceneid, id, name);
            }

            this.addAtomic(atomic, atomicStruct, textures);

            this.currentClumpBeingAdded = undefined;
            atomic.delete();
        }
        
        clump.delete();
    }
}

export class SceneData {
    public assetCache: AssetCache;
    public modelCache: ModelCache;
    public textureCache: TextureCache;
    public modelInfoCache: DataCache<Assets.ModelInfoAsset>;
    public jsps: JSP[];

    public objects: Base[] = [];
    public player: Player;
    public env: Env;
    public fog?: FogParams;
    public pickupTable?: Assets.PickupTableAsset;

    public findObject(id: number) {
        return this.objects.find((obj) => {
            return obj.id === id;
        });
    }

    public sendEvent(to: Base, toEvent: number) {
        if (to.eventFunc)
            to.eventFunc(to, toEvent);
        
        for (const link of to.links) {
            if (link.srcEvent === toEvent) {
                const dstBase = this.findObject(link.dstAssetID);

                if (dstBase)
                    this.sendEvent(dstBase, link.dstEvent);
            }
        }
    }
}

interface FogParams {
    start: number;
    stop: number;
    fogcolor: Color;
    bgcolor: Color;
}

export class JSP {
    constructor(public model: ClumpData) {}
}

class ModelInstance {
    data: ClumpData[] = [];
    color: Color = colorNewCopy(White);
    surface?: Surface;
}

export class Base {
    public id: number;
    public baseType: number;
    public linkCount: number;
    public baseFlags: number;
    public eventFunc?: (to: Base, toEvent: number) => void;

    constructor(asset: Assets.BaseAsset, public links: Assets.LinkAsset[], sceneData: SceneData) {
        this.id = asset.id;
        this.baseType = asset.baseType;
        this.linkCount = asset.linkCount;
        this.baseFlags = asset.baseFlags;
    }

    public update(sceneData: SceneData, dt: number) {}
}

export class Ent extends Base {
    public model = new ModelInstance();
    public visible: boolean;

    public isSkydome = false;
    public skydomeLockY = false;
    public skydomeSortOrder = 0;

    public modelMatrix = mat4.create();

    constructor(public asset: Assets.EntAsset, links: Assets.LinkAsset[], sceneData: SceneData) {
        super(asset, links, sceneData);

        this.visible = (asset.flags & Assets.EntFlags.Visible) != 0;
        this.model.color = {
            r: asset.redMult,
            g: asset.greenMult,
            b: asset.blueMult,
            a: asset.seeThru
        };

        const q = quat.create();
        quatFromYPR(q, asset.ang);
        mat4.fromRotationTranslationScale(this.modelMatrix, q, asset.pos, asset.scale);

        for (const link of links) {
            if (link.srcEvent === EventID.SceneBegin && link.dstEvent === EventID.SetSkyDome) {
                this.isSkydome = true;
                this.skydomeLockY = (link.param[1] === 1);
                this.skydomeSortOrder = link.param[0];
                break;
            }
        }
    }

    private recurseModelInfo(sceneData: SceneData, id: number) {
        let data = sceneData.modelCache.getByID(id);

        if (data) {
            this.model.data.push(data);
        } else {
            const modelInfo = sceneData.modelInfoCache.getByID(id);

            if (modelInfo) {
                for (let i = 0; i < modelInfo.NumModelInst; i++) {
                    this.recurseModelInfo(sceneData, modelInfo.modelInst[i].ModelID);
                }
            } else {
                console.log(`Can't find model/model info ID ${id.toString(16)}`);
            }
        }
    }

    public setup(sceneData: SceneData) {
        if (this.asset.surfaceID)
            this.model.surface = sceneData.findObject(this.asset.surfaceID) as Surface;
        
        this.recurseModelInfo(sceneData, this.asset.modelInfoID);
    }

    public update(sceneData: SceneData, dt: number) {
    }
}

export class EntMotion {
    constructor(public asset: Assets.EntMotionAsset) {
    }
}

export class Button extends Ent {
    private static redMultiplier = 1.0;
    private static greenMultiplier = 1.0;
    private static blueMultiplier = 1.0;
    private static colorMultiplier = 1.0;
    private static colorMultiplierSign = 1;

    constructor(public asset: Assets.EntAsset, public basset: Assets.ButtonAsset, public motion: EntMotion, links: Assets.LinkAsset[], sceneData: SceneData) {
        super(asset, links, sceneData);
    }

    // zEntButton_SceneUpdate
    public static sceneUpdate(dt: number) {
        this.colorMultiplier += 2.5 * dt * this.colorMultiplierSign;
        if (this.colorMultiplier > 1.0) {
            this.colorMultiplierSign *= -1;
            this.colorMultiplier = 1.0;
        }
        if (this.colorMultiplier < 0.0) {
            this.colorMultiplierSign *= -1;
            this.colorMultiplier = 0.0;
        }
        this.redMultiplier = 0.4 * this.colorMultiplier + 0.6;
        this.greenMultiplier = 0.4 * this.colorMultiplier + 0.6;
        this.blueMultiplier = 0.4 * this.colorMultiplier + 0.6;
    }

    public update(sceneData: SceneData, dt: number) {
        super.update(sceneData, dt);

        if (this.basset.actMethod == Assets.ButtonActMethod.Button) {
            this.model.color.r = Button.redMultiplier;
            this.model.color.g = Button.greenMultiplier;
            this.model.color.b = Button.blueMultiplier;
        }
    }
}

export class DestructObj extends Ent {
    constructor(public asset: Assets.EntAsset, public dasset: Assets.DestructObjAsset, links: Assets.LinkAsset[], sceneData: SceneData) {
        super(asset, links, sceneData);
    }
}

export class Dispatcher extends Base {
}

export class Env extends Base {
    public lightKit?: Assets.LightKit;

    constructor(public asset: Assets.EnvAsset, links: Assets.LinkAsset[], sceneData: SceneData) {
        super(asset, links, sceneData);

        const lightKitAsset = sceneData.assetCache.getByID(asset.objectLightKit);
        if (lightKitAsset) {
            const stream = new DataStream(lightKitAsset.data);
            this.lightKit = Assets.readLightKit(stream);
        }
    }
}

export class Fog extends Base {
    public eventFunc = (to: Base, toEvent: number) => {
        switch (toEvent) {
            case EventID.On: {
                this.sceneData.fog = {
                    start: this.asset.fogStart,
                    stop: this.asset.fogStop,
                    fogcolor: this.asset.fogColor,
                    bgcolor: this.asset.bkgndColor
                };
                break;
            }
        }
    };

    constructor(public asset: Assets.FogAsset, links: Assets.LinkAsset[], private sceneData: SceneData) {
        super(asset, links, sceneData);
    }
}

export class NPC extends Ent {
    constructor(public asset: Assets.EntAsset, public nasset: Assets.NPCAsset, links: Assets.LinkAsset[], sceneData: SceneData) {
        super(asset, links, sceneData);
    }
}

export class Pickup extends Ent {
    private static pickupOrientation = mat4.create();

    constructor(public asset: Assets.EntAsset, public passet: Assets.PickupAsset, links: Assets.LinkAsset[], sceneData: SceneData) {
        super(asset, links, sceneData);
    }

    public setup(sceneData: SceneData) {
        if (sceneData.pickupTable) {
            for (const entry of sceneData.pickupTable.entries) {
                if (entry.pickupHash === this.passet.pickupHash) {
                    this.asset.modelInfoID = entry.modelID;
                    break;
                }
            }
        }

        super.setup(sceneData);
    }

    public static sceneUpdate(dt: number) {
        const rotateSpeed = MathConstants.DEG_TO_RAD * 180 * dt;
        mat4.rotateY(this.pickupOrientation, this.pickupOrientation, rotateSpeed);
    }

    public update(sceneData: SceneData, dt: number) {
        const x = this.modelMatrix[12];
        const y = this.modelMatrix[13];
        const z = this.modelMatrix[14];
        mat4.copy(this.modelMatrix, Pickup.pickupOrientation);
        this.modelMatrix[12] = x;
        this.modelMatrix[13] = y;
        this.modelMatrix[14] = z;
    }
}

export class Platform extends Ent {
    constructor(public asset: Assets.EntAsset, public passet: Assets.PlatformAsset, public motion: EntMotion, links: Assets.LinkAsset[], sceneData: SceneData) {
        super(asset, links, sceneData);
    }
}

export class Player extends Ent {
    constructor(public asset: Assets.EntAsset, public lightKit: Assets.LightKit | undefined, links: Assets.LinkAsset[], sceneData: SceneData) {
        super(asset, links, sceneData);
    }
}

export class SimpleObj extends Ent {
    constructor(public asset: Assets.EntAsset, public sasset: Assets.SimpleObjAsset, links: Assets.LinkAsset[], sceneData: SceneData) {
        super(asset, links, sceneData);
    }
}

export class Surface extends Base {
    public uvOffset = vec2.create();

    constructor(public asset: Assets.SurfAsset, links: Assets.LinkAsset[], sceneData: SceneData) {
        super(asset, links, sceneData);
    }

    public update(sceneData: SceneData, dt: number) {
        const uvfx = this.asset.uvfx[0];
        this.uvOffset[0] += uvfx.trans_spd[0] * dt;
        this.uvOffset[1] += uvfx.trans_spd[1] * dt;
    }
}

const enum BFBBPass {
    MAIN,
    SKYDOME,
}

const LIGHTKIT_LIGHT_COUNT = 8;
const LIGHTKIT_LIGHT_SIZE = 4*4;
const LIGHTKIT_SIZE = LIGHTKIT_LIGHT_COUNT * LIGHTKIT_LIGHT_SIZE;

function fillConstant(d: Float32Array, offs: number, val: number, count: number): number {
    d.fill(val, offs, offs + count);
    return count;
}

function fillLightKit(d: Float32Array, offs: number, l: Assets.LightKit): number {
    for (let i = 0; i < LIGHTKIT_LIGHT_COUNT; i++) {
        if (l.lightCount > i) {
            const light = l.lightListArray[i];
            offs += fillVec4(d, offs, light.type, light.radius, light.angle);
            offs += fillVec4(d, offs, light.matrix[12], light.matrix[13], light.matrix[14]);
            offs += fillVec4(d, offs, light.matrix[8], light.matrix[9], light.matrix[10]);
            offs += fillColor(d, offs, light.color);
        } else {
            offs += fillConstant(d, offs, 0, LIGHTKIT_LIGHT_SIZE);
        }
    }
    return LIGHTKIT_SIZE;
}

interface RenderHacks {
    lighting: boolean;
    fog: boolean;
    skydome: boolean;
    player: boolean;
    invisibleEntities: boolean;
    invisibleAtomics: boolean;
}

interface RenderState {
    device: GfxDevice;
    instManager: GfxRenderInstManager;
    viewerInput: Viewer.ViewerRenderInput;
    deltaTime: number;
    cameraPosition: vec3;
    drawDistance: number;
    hacks: RenderHacks;
}

class BaseRenderer {
    public bbox = new AABB(Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity);
    public bboxModel = new AABB();
    public modelMatrix = mat4.create();
    public transparent = false;
    public isCulled = false;
    public drawDistance = -1;

    public renderers: BaseRenderer[] = [];

    constructor(public parent?: BaseRenderer) {}

    public addRenderer(renderer: BaseRenderer) {
        this.bbox.union(this.bbox, renderer.bbox);
        this.renderers.push(renderer);
    }

    public prepareToRender(renderState: RenderState) {
        if (this.parent)
            mat4.copy(this.modelMatrix, this.parent.modelMatrix);
        
        this.bboxModel.transform(this.bbox, this.modelMatrix);

        this.isCulled = false;

        if (this.parent && this.parent.isCulled) {
            this.isCulled = true;
            return;
        }

        if (!renderState.viewerInput.camera.frustum.contains(this.bboxModel)) {
            this.isCulled = true;
            return;
        }

        const drawDistance = this.drawDistance != -1 ? this.drawDistance : renderState.drawDistance;

        if (Math.sqrt(squaredDistanceFromPointToAABB(renderState.cameraPosition, this.bboxModel)) >= drawDistance)
            this.isCulled = true;
    }

    public destroy(device: GfxDevice) {
        for (let i = 0; i < this.renderers.length; i++)
            this.renderers[i].destroy(device);
        this.renderers.length = 0;
    }
}

function convertPipeBlendFunction(blend: Assets.PipeBlendFunction): GfxBlendFactor {
    switch (blend) {
        case Assets.PipeBlendFunction.Zero:
            return GfxBlendFactor.ZERO;
        case Assets.PipeBlendFunction.One:
            return GfxBlendFactor.ONE;
        case Assets.PipeBlendFunction.SrcColor:
            return GfxBlendFactor.SRC_COLOR;
        case Assets.PipeBlendFunction.InvSrcColor:
            return GfxBlendFactor.ONE_MINUS_SRC_COLOR;
        case Assets.PipeBlendFunction.SrcAlpha:
            return GfxBlendFactor.SRC_ALPHA;
        case Assets.PipeBlendFunction.InvSrcAlpha:
            return GfxBlendFactor.ONE_MINUS_SRC_ALPHA;
        case Assets.PipeBlendFunction.DestAlpha:
            return GfxBlendFactor.DST_ALPHA;
        case Assets.PipeBlendFunction.InvDestAlpha:
            return GfxBlendFactor.ONE_MINUS_DST_ALPHA;
        case Assets.PipeBlendFunction.DestColor:
            return GfxBlendFactor.DST_COLOR;
        case Assets.PipeBlendFunction.InvDestColor:
            return GfxBlendFactor.ONE_MINUS_DST_COLOR;
        case Assets.PipeBlendFunction.SrcAlphaSat:
        case Assets.PipeBlendFunction.NA:
        default:
            return -1;
    }
}

class MeshRenderer extends BaseRenderer {
    private vertexBuffer: GfxBuffer;
    private indexBuffer: GfxBuffer;
    private inputLayout: GfxInputLayout;
    private inputState: GfxInputState;
    private megaStateFlags: Partial<GfxMegaStateDescriptor> = {};
    private program: DeviceProgram;
    private gfxProgram: GfxProgram;
    private sortKey: number;
    private filterKey: number;

    private indices: number;

    private dualCull: boolean;
    private dualZWrite: boolean;

    constructor(parent: BaseRenderer | undefined, device: GfxDevice, defines: BFBBProgramDef, 
        public mesh: RWMeshFragData, private pipeInfo?: Assets.PipeInfo, subObject?: number) {

        super(parent);

        this.indices = mesh.indices.length;
        assert(this.indices > 0);

        const attrLen = 12;
        const vbuf = new Float32Array(mesh.vertices * attrLen);
        const ibuf = new Uint32Array(this.indices);
        let voffs = 0;
        let ioffs = 0;

        const posnorm = vec3.create();
        const color = colorNewCopy(White);
        const texcoord = vec2.create();

        for (let i = 0; i < mesh.vertices; i++) {
            mesh.fillPosition(posnorm, i);
            vbuf[voffs++] = posnorm[0];
            vbuf[voffs++] = posnorm[1];
            vbuf[voffs++] = posnorm[2];
            this.bbox.unionPoint(posnorm);
            mesh.fillNormal(posnorm, i);
            vbuf[voffs++] = posnorm[0];
            vbuf[voffs++] = posnorm[1];
            vbuf[voffs++] = posnorm[2];
            mesh.fillColor(color, i);
            voffs += fillColor(vbuf, voffs, color);
            mesh.fillTexCoord(texcoord, i);
            vbuf[voffs++] = texcoord[0];
            vbuf[voffs++] = texcoord[1];
        }

        for (let i = 0; i < mesh.indices.length; i++) {
            ibuf[ioffs++] = mesh.indices[i];
        }

        this.vertexBuffer = makeStaticDataBuffer(device, GfxBufferUsage.VERTEX, vbuf.buffer);
        this.indexBuffer  = makeStaticDataBuffer(device, GfxBufferUsage.INDEX,  ibuf.buffer);

        const vertexAttributeDescriptors: GfxVertexAttributeDescriptor[] = [
            { location: BFBBProgram.a_Position, bufferIndex: 0, format: GfxFormat.F32_RGB,  bufferByteOffset:  0  * 0x04 },
            { location: BFBBProgram.a_Normal,   bufferIndex: 0, format: GfxFormat.F32_RGB,  bufferByteOffset:  3  * 0x04 },
            { location: BFBBProgram.a_Color,    bufferIndex: 0, format: GfxFormat.F32_RGBA, bufferByteOffset:  6  * 0x04 },
            { location: BFBBProgram.a_TexCoord, bufferIndex: 0, format: GfxFormat.F32_RG,   bufferByteOffset:  10 * 0x04 },
        ];
        const vertexBufferDescriptors: GfxInputLayoutBufferDescriptor[] = [
            { byteStride: attrLen * 0x04, frequency: GfxVertexBufferFrequency.PER_VERTEX, },
        ];
        this.inputLayout = device.createInputLayout({ indexBufferFormat: GfxFormat.U32_R, vertexAttributeDescriptors, vertexBufferDescriptors });
        const buffers: GfxVertexBufferDescriptor[] = [{ buffer: this.vertexBuffer, byteOffset: 0 }];
        const indexBuffer: GfxIndexBufferDescriptor = { buffer: this.indexBuffer, byteOffset: 0 };
        this.inputState = device.createInputState(this.inputLayout, buffers, indexBuffer);

        this.megaStateFlags = {
            cullMode: GfxCullMode.NONE,
            depthWrite: !mesh.transparentTexture,
            depthCompare: reverseDepthForCompareMode(GfxCompareMode.LEQUAL)
        };
        let blendMode = GfxBlendMode.ADD;
        let blendDstFactor = GfxBlendFactor.ONE_MINUS_SRC_ALPHA;
        let blendSrcFactor = GfxBlendFactor.SRC_ALPHA;

        let useFog = !defines.SKY;
        let useLighting = !defines.SKY;
        let alphaRef = 0;

        this.dualCull = false;

        if (this.pipeInfo && (this.pipeInfo.SubObjectBits & subObject!)) {
            switch (this.pipeInfo.PipeFlags.cullMode) {
                case Assets.PipeCullMode.None:
                    this.megaStateFlags.cullMode = GfxCullMode.NONE;
                    break;
                case Assets.PipeCullMode.Back:
                    this.megaStateFlags.cullMode = GfxCullMode.BACK;
                    break;
                case Assets.PipeCullMode.Dual:
                    this.dualCull = true;
                    this.megaStateFlags.cullMode = GfxCullMode.FRONT;
                    break;
            }
            
            this.megaStateFlags.depthWrite = this.pipeInfo.PipeFlags.zWriteMode != Assets.PipeZWriteMode.Disabled;
            const dstFactor = convertPipeBlendFunction(this.pipeInfo.PipeFlags.dstBlend);
            const srcFactor = convertPipeBlendFunction(this.pipeInfo.PipeFlags.srcBlend);
            if (dstFactor != -1) blendDstFactor = dstFactor;
            if (srcFactor != -1) blendSrcFactor = srcFactor;

            if (this.pipeInfo.PipeFlags.noFog)
                useFog = false;
            
            if (this.pipeInfo.PipeFlags.noLighting)
                useLighting = false;
            
            if (this.pipeInfo.PipeFlags.alphaCompare)
                alphaRef = this.pipeInfo.PipeFlags.alphaCompare / 255;
        }

        if (useFog && !defines.USE_FOG)
            defines.USE_FOG = '1';
        if (useLighting && !defines.USE_LIGHTING)
            defines.USE_LIGHTING = '1';
        if (alphaRef && !defines.ALPHA_REF)
            defines.ALPHA_REF = alphaRef.toString();

        setAttachmentStateSimple(this.megaStateFlags, { blendMode, blendDstFactor, blendSrcFactor });

        this.transparent = mesh.transparentColors || mesh.transparentTexture;
        let renderLayer: number;

        if (this.transparent) {
            renderLayer = GfxRendererLayer.TRANSLUCENT;
            if (!this.megaStateFlags.depthWrite)
                renderLayer++;
        }
        else if (defines.SKY) {
            renderLayer = GfxRendererLayer.BACKGROUND;
        } else {
            renderLayer = GfxRendererLayer.OPAQUE;
        }

        this.program = new BFBBProgram(defines);
        this.gfxProgram = device.createProgram(this.program);

        this.sortKey = makeSortKey(renderLayer);
        this.filterKey = defines.SKY ? BFBBPass.SKYDOME : BFBBPass.MAIN;
    }

    public prepareRenderInst(renderInstManager: GfxRenderInstManager, viewSpaceDepth: number, secondPass: boolean) {
        const renderInst = renderInstManager.pushRenderInst();
        renderInst.setInputLayoutAndState(this.inputLayout, this.inputState);
        renderInst.drawIndexes(this.indices);
        renderInst.setGfxProgram(this.gfxProgram);

        const oldCullMode = this.megaStateFlags.cullMode;
        const oldDepthWrite = this.megaStateFlags.depthWrite;

        if (this.dualCull)
            this.megaStateFlags.cullMode = secondPass ? GfxCullMode.BACK : GfxCullMode.FRONT;
        else if (this.dualZWrite)
            this.megaStateFlags.depthWrite = secondPass;
        
        renderInst.setMegaStateFlags(this.megaStateFlags);

        this.megaStateFlags.cullMode = oldCullMode;
        this.megaStateFlags.depthWrite = oldDepthWrite;

        if (this.mesh.textureData !== undefined)
            renderInst.setSamplerBindingsFromTextureMappings(this.mesh.textureData.textureMapping);
        
        renderInst.sortKey = setSortKeyDepth(this.sortKey, viewSpaceDepth);
        renderInst.filterKey = this.filterKey;
    }

    public prepareToRender(renderState: RenderState) {
        super.prepareToRender(renderState);
        if (this.isCulled) return;

        //const depth = this.frag.distanceToCamera(renderState.cameraPosition, this.modelMatrix);
        const depth = computeViewSpaceDepthFromWorldSpaceAABB(renderState.viewerInput.camera, this.bboxModel);
        this.prepareRenderInst(renderState.instManager, depth, false);

        if (this.dualCull || this.dualZWrite)
            this.prepareRenderInst(renderState.instManager, depth, true);
    }

    public destroy(device: GfxDevice) {
        super.destroy(device);
        device.destroyBuffer(this.indexBuffer);
        device.destroyBuffer(this.vertexBuffer);
        device.destroyInputLayout(this.inputLayout);
        device.destroyInputState(this.inputState);
        device.destroyProgram(this.gfxProgram);
    }
}

class AtomicRenderer extends BaseRenderer {
    constructor(parent: BaseRenderer | undefined, device: GfxDevice, defines: BFBBProgramDef,
        public atomic: AtomicData, pipeInfo?: Assets.PipeInfo, subObject?: number) {

        super(parent);

        for (const mesh of atomic.meshes) {
            const meshDefines = Object.assign({}, defines);

            if (mesh.textureData) {
                mesh.textureData.setup(device);
                meshDefines.USE_TEXTURE = '1';
            }
            
            this.addRenderer(new MeshRenderer(this, device, meshDefines, mesh, pipeInfo, subObject));
        }
    }

    public prepareToRender(renderState: RenderState) {
        if (!this.atomic.visible && !renderState.hacks.invisibleAtomics) return;

        super.prepareToRender(renderState);
        if (this.isCulled) return;

        for (let i = 0; i < this.renderers.length; i++) 
            this.renderers[i].prepareToRender(renderState);
    }
}

class ClumpRenderer extends BaseRenderer {
    constructor(parent: BaseRenderer | undefined, device: GfxDevice,
        defines: BFBBProgramDef, public model: ClumpData, public color: Color = White) {

        super(parent);

        let subObject = 1 << (model.atomics.length - 1);

        for (let i = 0; i < model.atomics.length; i++) {
            this.addRenderer(new AtomicRenderer(this, device, defines, model.atomics[i], model.pipeInfo, subObject));
            subObject >>>= 1;
        }
    }

    public prepareToRender(renderState: RenderState) {
        if (this.color.a === 0) return;

        super.prepareToRender(renderState);
        if (this.isCulled) return;

        const template = renderState.instManager.pushTemplateRenderInst();
        template.setBindingLayouts(bindingLayouts);

        let offs = template.allocateUniformBuffer(BFBBProgram.ub_ModelParams, 12 + 4);
        const mapped = template.mapUniformBufferF32(BFBBProgram.ub_ModelParams);
        offs += fillMatrix4x3(mapped, offs, this.modelMatrix);
        offs += fillColor(mapped, offs, this.color);

        for (let i = 0; i < this.renderers.length; i++)
            this.renderers[i].prepareToRender(renderState);
        
        renderState.instManager.popTemplateRenderInst();
    }
}

class JSPRenderer extends BaseRenderer {
    public clumpRenderer: ClumpRenderer;

    constructor(device: GfxDevice, public readonly jsp: JSP) {
        super();

        this.clumpRenderer = new ClumpRenderer(this, device, { USE_LIGHTING: '0' }, jsp.model);
        this.addRenderer(this.clumpRenderer);
    }

    public prepareToRender(renderState: RenderState) {
        super.prepareToRender(renderState);
        if (this.isCulled) return;

        this.clumpRenderer.prepareToRender(renderState);
    }
}

class EntRenderer extends BaseRenderer {
    constructor(parent: BaseRenderer | undefined, device: GfxDevice, public readonly ent: Ent, defines: BFBBProgramDef = {}) {
        super(parent);

        defines.ENT = '1';

        if (ent.isSkydome) {
            defines.SKY = '1';
            defines.SKY_DEPTH = `${ent.skydomeSortOrder / 8.0}`;
        }

        for (let i = 0; i < ent.model.data.length; i++)
            this.addRenderer(new ClumpRenderer(this, device, defines, ent.model.data[i], ent.model.color));
    }

    public update(renderState: RenderState) {
        mat4.copy(this.modelMatrix, this.ent.modelMatrix);

        if (this.ent.isSkydome) {
            this.modelMatrix[12] = renderState.cameraPosition[0];
            this.modelMatrix[14] = renderState.cameraPosition[2];

            if (this.ent.skydomeLockY)
                this.modelMatrix[13] = renderState.cameraPosition[1];
        }
    }

    public prepareToRender(renderState: RenderState) {
        this.update(renderState);

        if (this.ent.model.color.a === 0) return;

        super.prepareToRender(renderState);
        if (this.isCulled || (!this.ent.visible && !renderState.hacks.invisibleEntities)) return;

        const template = renderState.instManager.pushTemplateRenderInst();
        template.setBindingLayouts(bindingLayouts);

        let offs = template.allocateUniformBuffer(BFBBProgram.ub_EntParams, 4);
        const mapped = template.mapUniformBufferF32(BFBBProgram.ub_EntParams);

        if (this.ent.model.surface)
            offs += fillVec4(mapped, offs, this.ent.model.surface.uvOffset[0], this.ent.model.surface.uvOffset[1]);
        else
            offs += fillVec4(mapped, offs, 0);

        for (let i = 0; i < this.renderers.length; i++) {
            const modelRenderer = this.renderers[i] as ClumpRenderer;
            modelRenderer.color = this.ent.model.color;
            modelRenderer.prepareToRender(renderState);
        }
        
        renderState.instManager.popTemplateRenderInst();
    }

    public destroy(device: GfxDevice) {
        for (let i = 0; i < this.renderers.length; i++)
            this.renderers[i].destroy(device);
    }
}

class ButtonRenderer extends EntRenderer {
    constructor(device: GfxDevice, public readonly button: Button, defines: BFBBProgramDef = {}) {
        super(undefined, device, button, defines);
    }
}

class DestructObjRenderer extends EntRenderer {
    constructor(device: GfxDevice, public readonly destructObj: DestructObj, defines: BFBBProgramDef = {}) {
        super(undefined, device, destructObj, defines);
    }
}

class NPCRenderer extends EntRenderer {
    constructor(device: GfxDevice, public readonly npc: NPC, defines: BFBBProgramDef = {}) {
        super(undefined, device, npc, defines);
    }
}

class PlatformRenderer extends EntRenderer {
    constructor(device: GfxDevice, public readonly platform: Platform, defines: BFBBProgramDef = {}) {
        super(undefined, device, platform, defines);
    }
}

const enum SBAtomicIndices {
    Body = 4,
    ArmL = 3,
    ArmR = 2,
    Ass = 0,
    Underwear = 1,
    Wand = 5,
    Tongue = 6,
    BubbleHelmet = 7,
    BubbleShoeL = 8,
    BubbleShoeR = 9,
    ShadowBody = 10,
    ShadowArmL = 11,
    ShadowArmR = 12,
    ShadowWand = 13,
    Count = 14
}

class PlayerRenderer extends EntRenderer {
    constructor(device: GfxDevice, public readonly player: Player, defines: BFBBProgramDef = { PLAYER: '1' }) {
        super(undefined, device, player, defines);

        this.player.model.color.a = 1.0;

        const atomics: AtomicData[] = [];
        for (const clump of player.model.data) {
            for (const atomic of clump.atomics)
                atomics.push(atomic);
        }

        if (atomics.length === SBAtomicIndices.Count) {
            atomics[SBAtomicIndices.Body].visible = true;
            atomics[SBAtomicIndices.ArmL].visible = true;
            atomics[SBAtomicIndices.ArmR].visible = true;
            atomics[SBAtomicIndices.Ass].visible = false;
            atomics[SBAtomicIndices.Underwear].visible = false;
            atomics[SBAtomicIndices.Wand].visible = false;
            atomics[SBAtomicIndices.Tongue].visible = false;
            atomics[SBAtomicIndices.BubbleHelmet].visible = false;
            atomics[SBAtomicIndices.BubbleShoeL].visible = false;
            atomics[SBAtomicIndices.BubbleShoeR].visible = false;
            atomics[SBAtomicIndices.ShadowBody].visible = false;
            atomics[SBAtomicIndices.ShadowArmL].visible = false;
            atomics[SBAtomicIndices.ShadowArmR].visible = false;
            atomics[SBAtomicIndices.ShadowWand].visible = false;
        }
    }
}

class PickupRenderer extends EntRenderer {
    constructor(device: GfxDevice, public readonly pickup: Pickup, defines: BFBBProgramDef = { USE_LIGHTING: '0' }) {
        super(undefined, device, pickup, defines);

        this.pickup = pickup;
        this.drawDistance = 144;
    }
}

class SimpleObjRenderer extends EntRenderer {
    constructor(device: GfxDevice, public readonly simpleObj: SimpleObj, defines: BFBBProgramDef = {}) {
        super(undefined, device, simpleObj, defines);
    }
}

export class BFBBRenderer implements Viewer.SceneGfx {
    private renderers: BaseRenderer[] = [];

    public renderHelper: GfxRenderHelper;
    private renderTarget = new BasicRenderTarget();

    private clearColor: Color;

    public renderHacks: RenderHacks = {
        lighting: true,
        fog: true,
        skydome: true,
        player: true,
        invisibleEntities: false,
        invisibleAtomics: false,
    };

    public ondestroy?: () => void;

    constructor(device: GfxDevice, public sceneData: SceneData) {
        this.renderHelper = new GfxRenderHelper(device);

        for (const jsp of sceneData.jsps)
            this.renderers.push(new JSPRenderer(device, jsp));
        
        for (const object of sceneData.objects) {
            if (object instanceof Ent)
                object.setup(sceneData);
            
            switch (object.baseType) {
                case BaseType.Button: {
                    this.renderers.push(new ButtonRenderer(device, object as Button));
                    break;
                }
                case BaseType.DestructObj: {
                    this.renderers.push(new DestructObjRenderer(device, object as DestructObj));
                    break;
                }
                case BaseType.Env: {
                    this.sceneData.env = object as Env;
                    break;
                }
                case BaseType.NPC: {
                    this.renderers.push(new NPCRenderer(device, object as NPC));
                    break;
                }
                case BaseType.Pickup: {
                    this.renderers.push(new PickupRenderer(device, object as Pickup));
                    break;
                }
                case BaseType.Platform: {
                    this.renderers.push(new PlatformRenderer(device, object as Platform));
                    break;
                }
                case BaseType.Player: {
                    this.sceneData.player = object as Player;
                    this.renderers.push(new PlayerRenderer(device, object as Player));
                    break;
                }
                case BaseType.Static: {
                    this.renderers.push(new SimpleObjRenderer(device, object as SimpleObj));
                    break;
                }
            }
        }

        for (const object of sceneData.objects)
            sceneData.sendEvent(object, EventID.SceneBegin);
        for (const object of sceneData.objects)
            sceneData.sendEvent(object, EventID.RoomBegin);
    }

    public createCameraController() {
        const controller = new FPSCameraController();
        controller.sceneKeySpeedMult = 0.025;
        return controller;
    }

    public update(renderState: RenderState) {
        Button.sceneUpdate(renderState.deltaTime);
        Pickup.sceneUpdate(renderState.deltaTime);

        for (let i = 0; i < this.sceneData.objects.length; i++)
            this.sceneData.objects[i].update(this.sceneData, renderState.deltaTime);
    }

    private scratchVec3 = vec3.create();

    public prepareToRender(device: GfxDevice, hostAccessPass: GfxHostAccessPass, viewerInput: Viewer.ViewerRenderInput): void {
        const fogEnabled = this.renderHacks.fog && this.sceneData.fog;
        this.clearColor = fogEnabled ? this.sceneData.fog!.bgcolor : TransparentBlack;
        const fogColor = fogEnabled ? this.sceneData.fog!.fogcolor : TransparentBlack;
        const fogStart = fogEnabled ? this.sceneData.fog!.start : 0;
        const fogStop = fogEnabled ? this.sceneData.fog!.stop : 0;

        viewerInput.camera.setClipPlanes(1);
        mat4.getTranslation(this.scratchVec3, viewerInput.camera.worldMatrix);

        const renderState: RenderState = {
            device: device,
            instManager: this.renderHelper.renderInstManager,
            viewerInput: viewerInput,
            deltaTime: viewerInput.deltaTime / 1000,
            cameraPosition: this.scratchVec3,
            hacks: this.renderHacks,
            drawDistance: fogStop ? Math.min(fogStop, MAX_DRAW_DISTANCE) : MAX_DRAW_DISTANCE,
        }

        this.update(renderState);

        this.renderHelper.pushTemplateRenderInst();
        const template = this.renderHelper.renderInstManager.pushTemplateRenderInst();
        template.setBindingLayouts(bindingLayouts);

        let offs = template.allocateUniformBuffer(BFBBProgram.ub_SceneParams, 16 + 12 + 2*4 + LIGHTKIT_SIZE*2);
        const mapped = template.mapUniformBufferF32(BFBBProgram.ub_SceneParams);
        offs += fillMatrix4x4(mapped, offs, viewerInput.camera.projectionMatrix);
        offs += fillMatrix4x3(mapped, offs, viewerInput.camera.viewMatrix);
        offs += fillColor(mapped, offs, fogColor);
        offs += fillVec4(mapped, offs, fogStart, fogStop);

        if (this.renderHacks.lighting && this.sceneData.env.lightKit)
            offs += fillLightKit(mapped, offs, this.sceneData.env.lightKit);
        else
            offs += fillConstant(mapped, offs, 0, LIGHTKIT_SIZE);
        
        if (this.renderHacks.player && this.renderHacks.lighting && this.sceneData.player.lightKit)
            offs += fillLightKit(mapped, offs, this.sceneData.player.lightKit);
        else
            offs += fillConstant(mapped, offs, 0, LIGHTKIT_SIZE);

        for (let i = 0; i < this.renderers.length; i++)
            this.renderers[i].prepareToRender(renderState);

        this.renderHelper.renderInstManager.popTemplateRenderInst();
        this.renderHelper.renderInstManager.popTemplateRenderInst();
        this.renderHelper.prepareToRender(device, hostAccessPass);
    }

    public render(device: GfxDevice, viewerInput: Viewer.ViewerRenderInput): GfxRenderPass {
        const renderInstManager = this.renderHelper.renderInstManager;

        const hostAccessPass = device.createHostAccessPass();
        this.prepareToRender(device, hostAccessPass, viewerInput);
        device.submitPass(hostAccessPass);

        this.renderTarget.setParameters(device, viewerInput.backbufferWidth, viewerInput.backbufferHeight);

        const clearColorPassDescriptor = makeClearRenderPassDescriptor(true, this.clearColor);

        if (this.renderHacks.skydome) {
            const skydomePassRenderer = this.renderTarget.createRenderPass(device, viewerInput.viewport, clearColorPassDescriptor);
            renderInstManager.setVisibleByFilterKeyExact(BFBBPass.SKYDOME);
            renderInstManager.drawOnPassRenderer(device, skydomePassRenderer);
            skydomePassRenderer.endPass(null);
            device.submitPass(skydomePassRenderer);
        }

        const clearPassDescriptor = this.renderHacks.skydome ? depthClearRenderPassDescriptor : clearColorPassDescriptor;
        const mainPassRenderer = this.renderTarget.createRenderPass(device, viewerInput.viewport, clearPassDescriptor);
        renderInstManager.setVisibleByFilterKeyExact(BFBBPass.MAIN);
        renderInstManager.drawOnPassRenderer(device, mainPassRenderer);

        this.renderHelper.renderInstManager.resetRenderInsts();

        return mainPassRenderer;
    }

    public createPanels(): UI.Panel[] {
        const panel = new UI.Panel();
        panel.customHeaderBackgroundColor = UI.COOL_BLUE_COLOR;
        panel.setTitle(UI.RENDER_HACKS_ICON, 'Render Hacks');

        const lightingCheckbox = new UI.Checkbox('Lighting', this.renderHacks.lighting);
        lightingCheckbox.onchanged = () => { this.renderHacks.lighting = lightingCheckbox.checked; };
        panel.contents.appendChild(lightingCheckbox.elem);

        const fogCheckbox = new UI.Checkbox('Fog', this.renderHacks.fog);
        fogCheckbox.onchanged = () => { this.renderHacks.fog = fogCheckbox.checked; }
        panel.contents.appendChild(fogCheckbox.elem);

        const skydomeCheckbox = new UI.Checkbox('Skydome', this.renderHacks.skydome);
        skydomeCheckbox.onchanged = () => { this.renderHacks.skydome = skydomeCheckbox.checked; };
        panel.contents.appendChild(skydomeCheckbox.elem);

        const playerCheckbox = new UI.Checkbox('Player', this.renderHacks.player);
        playerCheckbox.onchanged = () => { this.renderHacks.player = playerCheckbox.checked; };
        panel.contents.appendChild(playerCheckbox.elem);

        const invisibleEntitiesCheckbox = new UI.Checkbox('Invisible Entities', this.renderHacks.invisibleEntities);
        invisibleEntitiesCheckbox.onchanged = () => { this.renderHacks.invisibleEntities = invisibleEntitiesCheckbox.checked; };
        panel.contents.appendChild(invisibleEntitiesCheckbox.elem);

        const invisibleAtomicsCheckbox = new UI.Checkbox('Invisible Atomics', this.renderHacks.invisibleAtomics);
        invisibleAtomicsCheckbox.onchanged = () => { this.renderHacks.invisibleAtomics = invisibleAtomicsCheckbox.checked; };
        panel.contents.appendChild(invisibleAtomicsCheckbox.elem);

        panel.setVisible(true);
        return [panel];
    }

    public destroy(device: GfxDevice): void {
        this.renderHelper.destroy(device);
        this.renderTarget.destroy(device);
        for (let i = 0; i < this.renderers.length; i++)
            this.renderers[i].destroy(device);
        this.renderers.length = 0;

        if (this.ondestroy)
            this.ondestroy();
    }
}