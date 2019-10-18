
import * as Viewer from '../viewer';
import * as rw from 'librw';
import { GfxDevice } from '../gfx/platform/GfxPlatform';
import { DataFetcher } from '../DataFetcher';
import { GTA3Renderer, SceneRenderer, DrawKey, Texture, TextureArray, MeshInstance, ModelCache, SkyRenderer } from './render';
import { SceneContext } from '../SceneBase';
import { getTextDecoder, assert } from '../util';
import { parseItemPlacement, ItemPlacement, parseItemDefinition, ItemDefinition, ObjectDefinition, ItemInstance, parseZones } from './item';
import { parseTimeCycle, ColorSet } from './time';
import { parseWaterPro, waterMeshFragData, waterDefinition } from './water';
import { quat, vec3 } from 'gl-matrix';
import { AABB } from '../Geometry';
import { GfxRendererLayer } from '../gfx/render/GfxRenderer';
import ArrayBufferSlice from '../ArrayBufferSlice';

const pathBase = `GrandTheftAuto3`;

function UTF8ToString(array: Uint8Array) {
    let length = 0; while (length < array.length && array[length]) length++;
    return getTextDecoder('utf8')!.decode(array.subarray(0, length));
}

class GTA3SceneDesc implements Viewer.SceneDesc {
    private static initialised = false;
    private complete: boolean;
    private assets = new Map<string, ArrayBufferSlice>();
    private ids: string[];

    constructor(public id: string, public name: string) {
        this.complete = (this.id === 'all');
        if (this.complete) {
            this.ids = [
                "comntop/comNtop",
                "comnbtm/comNbtm",
                "comse/comSE",
                "comsw/comSW",
                "industne/industNE",
                "industnw/industNW",
                "industse/industSE",
                "industsw/industSW",
                "landne/landne",
                "landsw/landsw",
                "overview",
                "props"
            ];
        } else {
            this.ids = this.id.split(';');
        }
    }

    private static async initialise() {
        if (this.initialised)
            return;

        await rw.init({ gtaPlugins: true, platform: rw.Platform.PLATFORM_D3D8 });
        rw.Texture.setCreateDummies(true);
        rw.Texture.setLoadTextures(false);
        this.initialised = true;
    }

    private async fetchIMG(dataFetcher: DataFetcher): Promise<void> {
        const [bufferDIR, bufferIMG] = await Promise.all([
            dataFetcher.fetchData(`${pathBase}/models/gta3.dir`),
            dataFetcher.fetchData(`${pathBase}/models/gta3.img`),
        ]);
        const view = bufferDIR.createDataView();
        for (let i = 0; i < view.byteLength; i += 32) {
            const offset = view.getUint32(i + 0, true);
            const size = view.getUint32(i + 4, true);
            const name = UTF8ToString(bufferDIR.subarray(i + 8, 24).createTypedArray(Uint8Array)).toLowerCase();
            const data = bufferIMG.subarray(2048 * offset, 2048 * size);
            this.assets.set(`${pathBase}/models/gta3/${name}`, data);
        }
    }

    private async fetch(dataFetcher: DataFetcher, path: string): Promise<ArrayBufferSlice> {
        let buffer = this.assets.get(path);
        if (buffer === undefined) {
            buffer = await dataFetcher.fetchData(path);
            this.assets.set(path, buffer);
        }
        return buffer;
    }

    private async fetchIDE(dataFetcher: DataFetcher, id: string): Promise<ItemDefinition> {
        const buffer = await this.fetch(dataFetcher, `${pathBase}/data/maps/${id}.ide`);
        const text = getTextDecoder('utf8')!.decode(buffer.createDataView());
        return parseItemDefinition(text);
    }

    private async fetchIPL(dataFetcher: DataFetcher, id: string): Promise<ItemPlacement> {
        if (id === 'test') return {
            instances: [{
                id: 0,
                modelName: 'billboard01',
                rotation: quat.fromValues(0,0,0,1),
                translation: vec3.fromValues(0,0,0),
                scale: vec3.fromValues(10,10,10),
            }]
        };
        const buffer = await this.fetch(dataFetcher, (id === 'props') ? `${pathBase}/data/maps/props.IPL` : `${pathBase}/data/maps/${id}.ipl`);
        const text = getTextDecoder('utf8')!.decode(buffer.createDataView());
        return parseItemPlacement(text);
    }

    private async fetchTimeCycle(dataFetcher: DataFetcher): Promise<ColorSet[]> {
        const buffer = await this.fetch(dataFetcher, `${pathBase}/data/timecyc.dat`);
        const text = getTextDecoder('utf8')!.decode(buffer.createDataView());
        return parseTimeCycle(text);
    }

    private async fetchZones(dataFetcher: DataFetcher): Promise<Map<string, AABB>> {
        const buffer = await this.fetch(dataFetcher, `${pathBase}/data/gta3.zon`);
        const text = getTextDecoder('utf8')!.decode(buffer.createDataView());
        return parseZones(text);
    }

    private async fetchWater(dataFetcher: DataFetcher): Promise<ItemPlacement> {
        const buffer = await this.fetch(dataFetcher, `${pathBase}/data/waterpro.dat`);
        return parseWaterPro(buffer.createDataView());
    }

    private async fetchTXD(dataFetcher: DataFetcher, txdName: string, textures: Map<string, Texture>): Promise<void> {
        const txdPath = (txdName === 'generic' || txdName === 'particle')
                      ? `${pathBase}/models/${txdName}.txd`
                      : `${pathBase}/models/gta3/${txdName}.txd`;
        const buffer = await this.fetch(dataFetcher, txdPath);
        const stream = new rw.StreamMemory(buffer.createTypedArray(Uint8Array));
        const header = new rw.ChunkHeaderInfo(stream);
        assert(header.type === rw.PluginID.ID_TEXDICTIONARY);
        const txd = new rw.TexDictionary(stream);
        header.delete();
        stream.delete();
        for (let lnk = txd.textures.begin; !lnk.is(txd.textures.end); lnk = lnk.next) {
            const texture = new Texture(rw.Texture.fromDict(lnk), txdName);
            textures.set(texture.name, texture);
        }
        txd.delete();
    }

    private async fetchDFF(dataFetcher: DataFetcher, modelName: string, cb: (clump: rw.Clump) => void): Promise<void> {
        const dffPath = `${pathBase}/models/gta3/${modelName}.dff`;
        const buffer = await this.fetch(dataFetcher, dffPath);
        const stream = new rw.StreamMemory(buffer.createTypedArray(Uint8Array));
        const header = new rw.ChunkHeaderInfo(stream);
        assert(header.type === rw.PluginID.ID_CLUMP);
        const clump = rw.Clump.streamRead(stream);
        header.delete();
        stream.delete();
        cb(clump);
        clump.delete();
    }

    public async createScene(device: GfxDevice, context: SceneContext): Promise<Viewer.SceneGfx> {
        await GTA3SceneDesc.initialise();
        const dataFetcher = context.dataFetcher;
        const objects = new Map<String, ObjectDefinition>();

        const ideids = ['generic', 'temppart/temppart', 'comroad/comroad', 'indroads/indroads', 'making/making', 'subroads/subroads'];
        for (const id of this.ids)
            if (id.match(/\//)) ideids.push(id.toLowerCase());
        const ides = await Promise.all(ideids.map(id => this.fetchIDE(dataFetcher, id)));
        for (const ide of ides) for (const obj of ide.objects) objects.set(obj.modelName, obj);
        objects.set('water', waterDefinition);

        const ipls = await Promise.all(this.ids.map(id => this.fetchIPL(dataFetcher, id)));
        const [colorSets, zones, water] = await Promise.all([this.fetchTimeCycle(dataFetcher), this.fetchZones(dataFetcher), this.fetchWater(dataFetcher)]);
        ipls.push(water);

        const drawKeys = new Map<string, DrawKey>();
        const layers = new Map<DrawKey, [ItemInstance, ObjectDefinition][]>();
        for (const ipl of ipls) for (const item of ipl.instances) {
            const name = item.modelName;
            const obj = objects.get(name);
            if (!obj) {
                console.warn('No definition for object', name);
                continue;
            }
            if ((name.startsWith('lod') && name !== 'lodistancoast01') || name.startsWith('islandlod')) continue; // ignore LOD objects

            let zone = 'cityzon';
            for (const [name, bb] of zones) {
                if (bb.containsPoint(item.translation)) {
                    zone = name;
                    break;
                }
            }
            const drawKeyObj = new DrawKey(obj, zone);
            const drawKeyStr = JSON.stringify(drawKeyObj);
            if (!drawKeys.has(drawKeyStr))
                drawKeys.set(drawKeyStr, drawKeyObj);
            const drawKey = drawKeys.get(drawKeyStr)!;
            if (!layers.has(drawKey)) layers.set(drawKey, []);
            layers.get(drawKey)!.push([item, obj]);
        }

        if (this.complete)
            await this.fetchIMG(dataFetcher);

        const renderer = new GTA3Renderer(device, colorSets);
        const loadedTXD = new Map<string, Promise<void>>();
        const loadedDFF = new Map<string, Promise<void>>();
        const textures  = new Map<string, Texture>();
        const modelCache = new ModelCache();

        loadedTXD.set('particle', this.fetchTXD(dataFetcher, 'particle', textures));
        loadedDFF.set('water', (async () => {})());
        modelCache.meshData.set('water', [waterMeshFragData]);

        loadedTXD.get('particle')!.then(() =>
            renderer.sceneRenderers.push(new SkyRenderer(device,
                new TextureArray(device, [textures.get('particle/water_old')!]))));

        for (const [drawKey, items] of layers) {
            const promises: Promise<void>[] = [];
            for (const [item, obj] of items) {
                if (!loadedTXD.has(obj.txdName))
                    loadedTXD.set(obj.txdName, this.fetchTXD(dataFetcher, obj.txdName, textures));
                if (!loadedDFF.has(obj.modelName))
                    loadedDFF.set(obj.modelName, this.fetchDFF(dataFetcher, obj.modelName, clump => modelCache.addModel(clump, obj)));
                promises.push(loadedTXD.get(obj.txdName)!, loadedDFF.get(obj.modelName)!);
            }
            const promise = Promise.all(promises).then(() => {
                const layerTextures = new Map<string, Set<Texture>>();
                const layerMeshes: MeshInstance[] = [];
                for (const [item, obj] of items) {
                    const model = modelCache.meshData.get(item.modelName);
                    if (model === undefined) {
                        console.warn('Missing model', item.modelName);
                        continue;
                    }
                    for (const frag of model) {
                        if (frag.texName === undefined) continue;
                        const texture = textures.get(frag.texName);
                        if (texture === undefined) {
                            console.warn('Missing texture', frag.texName, 'for', item.modelName);
                        } else {
                            let res = texture.width + 'x' + texture.height;
                            if (rw.Raster.formatHasAlpha(texture.format))
                                res += 'alpha';
                            if (!layerTextures.has(res)) layerTextures.set(res, new Set());
                            layerTextures.get(res)!.add(texture);
                        }
                    }
                    layerMeshes.push(new MeshInstance(model, item));
                }
                for (const [res, textures] of layerTextures) {
                    const key = Object.assign({}, drawKey);
                    if (res.endsWith('alpha'))
                        key.renderLayer = GfxRendererLayer.TRANSLUCENT;
                    const atlas = (textures.size > 0) ? new TextureArray(device, Array.from(textures)) : undefined;
                    const sceneRenderer = new SceneRenderer(device, key, layerMeshes, atlas);
                    renderer.sceneRenderers.push(sceneRenderer);
                }
            });
            if (this.complete)
                await promise;
        }

        if (this.complete)
            this.assets.clear();

        return renderer;
    }
}

const id = `GrandTheftAuto3`;
const name = "Grand Theft Auto III";
const sceneDescs = [
    //new GTA3SceneDesc("test", "Test"),
    new GTA3SceneDesc("all", "Liberty City"),
    "Portland",
    new GTA3SceneDesc("industne/industNE", "North-east"),
    new GTA3SceneDesc("industnw/industNW", "North-west"),
    new GTA3SceneDesc("industse/industSE", "South-east"),
    new GTA3SceneDesc("industsw/industSW", "South-west"),
    "Staunton Island",
    new GTA3SceneDesc("comntop/comNtop", "North"),
    new GTA3SceneDesc("comnbtm/comNbtm", "Central"),
    new GTA3SceneDesc("comse/comSE", "South-east"),
    new GTA3SceneDesc("comsw/comSW", "South-west"),
    "Shoreside Vale",
    new GTA3SceneDesc("landne/landne", "North-east"),
    new GTA3SceneDesc("landsw/landsw", "South-west"),
];

export const sceneGroup: Viewer.SceneGroup = { id, name, sceneDescs };