
import * as rw from 'librw';
import * as Viewer from '../viewer';
import { GfxDevice } from '../gfx/platform/GfxPlatform';
import { SceneContext } from '../SceneBase';
import { DataFetcher } from '../DataFetcher';
import { initializeBasis } from '../vendor/basis_universal';

import { ModelCache, BFBBRenderer, TextureCache, TextureData, Fog, JSP, textureNameRW3, SceneData, AssetCache, Dispatcher, SimpleObj, Env, Surface, Platform, EntMotion, Button, Pickup, NPC, Player, DestructObj } from './render';
import { parseHIP, Asset } from './hip';
import * as Assets from './assets';
import { DataStream, parseRWChunks, createRWStreamFromChunk, DataCache as DataCache } from './util';
import { assert } from '../util';
import { AssetType } from './enums';

const dataPath = 'bfbb/xbox';

const assetCache = new AssetCache();
const modelCache = new ModelCache();
const textureCache = new TextureCache();
const modelInfoCache = new DataCache<Assets.ModelInfoAsset>();
const jsps: JSP[] = [];
let pickupTable: Assets.PickupTableAsset | undefined;

async function loadHIP(dataFetcher: DataFetcher, path: string, sceneid: string) {
    const data = await dataFetcher.fetchData(`${dataPath}/${path}`);
    const hip = parseHIP(data);

    function loadClump(asset: Asset) {
        const chunks = parseRWChunks(asset.data);
        const clumpChunk = chunks[0];

        assert(clumpChunk.header.type === rw.PluginID.ID_CLUMP);

        const stream = createRWStreamFromChunk(clumpChunk);
        const clump = rw.Clump.streamRead(stream);

        const textures: TextureData[] = [];

        for (let lnk = clump.atomics.begin; !lnk.is(clump.atomics.end); lnk = lnk.next) {
            const meshHeader = rw.Atomic.fromClump(lnk).geometry.meshHeader;
            for (let i = 0; i < meshHeader.numMeshes; i++) {
                const texture = meshHeader.mesh(i).material.texture;
                if (texture) {
                    const textureData = textureCache.getByName(textureNameRW3(texture.name));
                    if (textureData)
                        textures.push(textureData);
                }
            }
        }

        modelCache.addClump(clumpChunk, clump, sceneid, asset.id, asset.name, textures);
    }

    function loadTexture(asset: Asset) {
        const stream = new rw.StreamMemory(asset.data.createTypedArray(Uint8Array));
        const chunk = new rw.ChunkHeaderInfo(stream);

        assert(chunk.type === rw.PluginID.ID_TEXDICTIONARY);

        const texdic = new rw.TexDictionary(stream);
        textureCache.addTexDictionary(texdic, sceneid, asset.id, asset.name);

        stream.delete();
        chunk.delete();
        texdic.delete();
    }

    for (const layer of hip.layers) {
        for (const asset of layer.assets) {
            if (asset.data.byteLength === 0)
                continue;

            assetCache.addAsset(asset, sceneid);

            switch (asset.type) {
                case AssetType.JSP: {
                    const firstChunkType = asset.data.createDataView(0, 4).getUint32(0, true);

                    if (firstChunkType === 0xBEEF01) {
                        // JSP Info (todo)
                    } else {
                        loadClump(asset);

                        const model = modelCache.getByID(asset.id)!;
                        jsps.push(new JSP(model));
                    }

                    break;
                }
                case AssetType.MINF: {
                    modelInfoCache.add(Assets.readModelInfo(new DataStream(asset.data)), sceneid, asset.id, asset.name);
                    break;
                }
                case AssetType.MODL: {
                    loadClump(asset);
                    break;
                }
                case AssetType.PICK: {
                    pickupTable = Assets.readPickupTable(new DataStream(asset.data));
                    break;
                }
                case AssetType.PIPT: {
                    const pipeInfoTable = Assets.readPipeInfoTable(new DataStream(asset.data));

                    for (const entry of pipeInfoTable) {
                        const model = modelCache.getByID(entry.ModelHashID);
                        if (model)
                            model.pipeInfo = entry;
                    }
                    break;
                }
                case AssetType.RWTX: {
                    loadTexture(asset);
                    break;
                }
            }
        }
    }
}

class BFBBSceneDesc implements Viewer.SceneDesc {
    private static initialised = false;

    constructor(public id: string, public name: string, public beta: boolean = false) {
        this.id = this.id.toLowerCase();
    }

    private static async initialize(dataFetcher: DataFetcher) {
        if (this.initialised)
            return;

        await rw.init({ gtaPlugins: true, platform: rw.Platform.PLATFORM_D3D8 });
        rw.Texture.setCreateDummies(true);
        rw.Texture.setLoadTextures(false);
        await initializeBasis();

        await loadHIP(dataFetcher, 'boot.HIP', 'boot');

        this.initialised = true;
    }

    public async createScene(gfxDevice: GfxDevice, context: SceneContext): Promise<Viewer.SceneGfx> {
        await BFBBSceneDesc.initialize(context.dataFetcher);

        const hipPath = `${this.id.substr(0, 2)}/${this.id}`;

        await loadHIP(context.dataFetcher, `${hipPath}.HOP`, this.id);
        await loadHIP(context.dataFetcher, `${hipPath}.HIP`, this.id);

        const sceneData = new SceneData();
        sceneData.assetCache = assetCache;
        sceneData.modelCache = modelCache;
        sceneData.textureCache = textureCache;
        sceneData.modelInfoCache = modelInfoCache;
        sceneData.jsps = jsps;
        sceneData.pickupTable = pickupTable;

        for (const entry of assetCache.entries) {
            const asset = entry.data;
            const stream = new DataStream(asset.data);

            switch (asset.type) {
                case AssetType.BUTN: {
                    const entAsset = Assets.readEntAsset(stream, this.beta);
                    const butnAsset = Assets.readButtonAsset(stream);
                    const motionAsset = Assets.readEntMotionAsset(stream);
                    const motion = new EntMotion(motionAsset);
                    const links = Assets.readLinks(stream, entAsset.linkCount);
                    sceneData.objects.push(new Button(entAsset, butnAsset, motion, links, sceneData));
                    break;
                }
                case AssetType.DPAT: {
                    const dpatAsset = Assets.readBaseAsset(stream);
                    const links = Assets.readLinks(stream, dpatAsset.linkCount);
                    sceneData.objects.push(new Dispatcher(dpatAsset, links, sceneData));
                    break;
                }
                case AssetType.DSTR: {
                    const entAsset = Assets.readEntAsset(stream, this.beta);
                    const dstrAsset = Assets.readDestructObjAsset(stream);
                    const links = Assets.readLinks(stream, entAsset.linkCount);
                    sceneData.objects.push(new DestructObj(entAsset, dstrAsset, links, sceneData));
                    break;
                }
                case AssetType.ENV: {
                    const envAsset = Assets.readEnvAsset(stream);
                    const links = Assets.readLinks(stream, envAsset.linkCount);
                    sceneData.objects.push(new Env(envAsset, links, sceneData));
                    break;
                }
                case AssetType.FOG: {
                    const fogAsset = Assets.readFogAsset(stream);
                    const links = Assets.readLinks(stream, fogAsset.linkCount);
                    sceneData.objects.push(new Fog(fogAsset, links, sceneData));
                    break;
                }
                case AssetType.PKUP: {
                    const entAsset = Assets.readEntAsset(stream, this.beta);
                    const pkupAsset = Assets.readPickupAsset(stream);
                    const links = Assets.readLinks(stream, entAsset.linkCount);
                    sceneData.objects.push(new Pickup(entAsset, pkupAsset, links, sceneData));
                    break;
                }
                case AssetType.PLAT: {
                    const entAsset = Assets.readEntAsset(stream, this.beta);
                    const platAsset = Assets.readPlatformAsset(stream);
                    const motionAsset = Assets.readEntMotionAsset(stream);
                    const motion = new EntMotion(motionAsset);
                    const links = Assets.readLinks(stream, entAsset.linkCount);
                    sceneData.objects.push(new Platform(entAsset, platAsset, motion, links, sceneData));
                    break;
                }
                case AssetType.PLYR: {
                    if (entry.sceneid === this.id) {
                        const entAsset = Assets.readEntAsset(stream, this.beta);
                        const links = Assets.readLinks(stream, entAsset.linkCount);
                        const lightKitID = stream.readUInt32();
                        const lightKitAsset = lightKitID ? sceneData.assetCache.getByID(lightKitID) : undefined;
                        const lightKit = lightKitAsset ? Assets.readLightKit(new DataStream(lightKitAsset.data)) : undefined;
                        sceneData.objects.push(new Player(entAsset, lightKit, links, sceneData));
                    }
                    break;
                }
                case AssetType.SIMP: {
                    const entAsset = Assets.readEntAsset(stream, this.beta);
                    const simpAsset = Assets.readSimpleObjAsset(stream);
                    const links = Assets.readLinks(stream, entAsset.linkCount);
                    sceneData.objects.push(new SimpleObj(entAsset, simpAsset, links, sceneData));
                    break;
                }
                case AssetType.SURF: {
                    const surfAsset = Assets.readSurfAsset(stream);
                    const links = Assets.readLinks(stream, surfAsset.linkCount);
                    sceneData.objects.push(new Surface(surfAsset, links, sceneData));
                    break;
                }
                case AssetType.VIL: {
                    const entAsset = Assets.readEntAsset(stream, this.beta);
                    const npcAsset = Assets.readNPCAsset(stream);
                    const links = Assets.readLinks(stream, entAsset.linkCount);
                    sceneData.objects.push(new NPC(entAsset, npcAsset, links, sceneData));
                    break;
                }
            }
        }

        const renderer = new BFBBRenderer(gfxDevice, sceneData);
        const cache = renderer.renderHelper.getCache();

        renderer.ondestroy = () => {
            assetCache.clearScene(this.id);
            modelCache.clearScene(this.id);
            textureCache.clearScene(this.id);
            jsps.length = 0;
        };
        
        return renderer;
    }
}

const sceneDescs = [
    'Main Menu',
    new BFBBSceneDesc('MNU3', 'Main Menu'),
    'Bikini Bottom',
    new BFBBSceneDesc('HB00', 'Prologue Cutscene'),
    new BFBBSceneDesc('HB01', 'Bikini Bottom'),
    new BFBBSceneDesc('HB02', 'SpongeBob\'s Pineapple'),
    new BFBBSceneDesc('HB03', 'Squidward\'s Tiki'),
    new BFBBSceneDesc('HB04', 'Patrick\'s Rock'),
    new BFBBSceneDesc('HB05', 'Sandy\'s Treedome'),
    new BFBBSceneDesc('HB06', 'Shady Shoals'),
    new BFBBSceneDesc('HB07', 'Krusty Krab'),
    new BFBBSceneDesc('HB08', 'Chum Bucket'),
    new BFBBSceneDesc('HB09', 'Police Station'),
    new BFBBSceneDesc('HB10', 'Theater'),
    'Jellyfish Fields',
    new BFBBSceneDesc('JF01', 'Jellyfish Rock'),
    new BFBBSceneDesc('JF02', 'Jellyfish Caves'),
    new BFBBSceneDesc('JF03', 'Jellyfish Lake'),
    new BFBBSceneDesc('JF04', 'Spork Mountain'),
    'Downtown Bikini Bottom',
    new BFBBSceneDesc('BB01', 'Downtown Streets'),
    new BFBBSceneDesc('BB02', 'Downtown Rooftops'),
    new BFBBSceneDesc('BB03', 'Lighthouse'),
    new BFBBSceneDesc('BB04', 'Sea Needle'),
    'Goo Lagoon',
    new BFBBSceneDesc('GL01', 'Goo Lagoon Beach'),
    new BFBBSceneDesc('GL02', 'Goo Lagoon Sea Caves'),
    new BFBBSceneDesc('GL03', 'Goo Lagoon Pier'),
    'Poseidome',
    new BFBBSceneDesc('B101', 'Poseidome'),
    'Rock Bottom',
    new BFBBSceneDesc('RB01', 'Downtown Rock Bottom'),
    new BFBBSceneDesc('RB02', 'Rock Bottom Museum'),
    new BFBBSceneDesc('RB03', 'Trench of Advanced Darkness'),
    'Mermalair',
    new BFBBSceneDesc('BC01', 'Mermalair Lobby'),
    new BFBBSceneDesc('BC02', 'Mermalair Main Chamber'),
    new BFBBSceneDesc('BC03', 'Mermalair Security Tunnel'),
    new BFBBSceneDesc('BC04', 'Rolling Ball Area'),
    new BFBBSceneDesc('BC05', 'Villain Containment Area'),
    'Sand Mountain',
    new BFBBSceneDesc('SM01', 'Ski Lodge'),
    new BFBBSceneDesc('SM02', 'Guppy Mound'),
    new BFBBSceneDesc('SM03', 'Flounder Hill'),
    new BFBBSceneDesc('SM04', 'Sand Mountain'),
    'Industrial Park',
    new BFBBSceneDesc('B201', 'Industrial Park'),
    'Kelp Forest',
    new BFBBSceneDesc('KF01', 'Kelp Forest'),
    new BFBBSceneDesc('KF02', 'Kelp Swamp'),
    new BFBBSceneDesc('KF04', 'Kelp Caves'),
    new BFBBSceneDesc('KF05', 'Kelp Vines'),
    'Flying Dutchman\'s Graveyard',
    new BFBBSceneDesc('GY01', 'Graveyard Lake'),
    new BFBBSceneDesc('GY02', 'Graveyard of Ships'),
    new BFBBSceneDesc('GY03', 'Dutchman\'s Ship'),
    new BFBBSceneDesc('GY04', 'Flying Dutchman Battle'),
    'SpongeBob\'s Dream',
    new BFBBSceneDesc('DB01', 'SpongeBob\'s Dream'),
    new BFBBSceneDesc('DB02', 'Sandy\'s Dream'),
    new BFBBSceneDesc('DB03', 'Squidward\'s Dream'),
    new BFBBSceneDesc('DB04', 'Mr. Krabs\' Dream'),
    new BFBBSceneDesc('DB05', 'Patrick\'s Dream (unused)', true),
    new BFBBSceneDesc('DB06', 'Patrick\'s Dream'),
    'Chum Bucket Lab',
    new BFBBSceneDesc('B301', 'MuscleBob Fight (unused)'),
    new BFBBSceneDesc('B302', 'Kah-Rah-Tae!'),
    new BFBBSceneDesc('B303', 'The Small Shall Rule... Or Not'),
    'SpongeBall Arena',
    new BFBBSceneDesc('PG12', 'SpongeBall Arena')
];

const id = 'bfbb';
const name = "SpongeBob SquarePants: Battle for Bikini Bottom";
export const sceneGroup: Viewer.SceneGroup = {
    id, name, sceneDescs,
};