
import { DataStream } from './util';
import { vec3, mat4 } from 'gl-matrix';
import { Color } from '../Color';

export interface LinkAsset {
    srcEvent: number;
    dstEvent: number;
    dstAssetID: number;
    param: number[];
    paramWidgetAssetID: number;
    chkAssetID: number;
}

export function readLinks(stream: DataStream, linkCount: number): LinkAsset[] {
    const links: LinkAsset[] = [];
    for (let i = 0; i < linkCount; i++) {
        const srcEvent = stream.readUInt16();
        const dstEvent = stream.readUInt16();
        const dstAssetID = stream.readUInt32();
        const param: number[] = [];
        for (let j = 0; j < 4; j++)
            param.push(stream.readFloat());
        const paramWidgetAssetID = stream.readUInt32();
        const chkAssetID = stream.readUInt32();
        links.push({ srcEvent, dstEvent, dstAssetID, param, paramWidgetAssetID, chkAssetID });
    }
    return links;
}

export const enum BaseFlags {
    Enabled = 0x1,
    Persistent = 0x2,
    Valid = 0x4,
    CutsceneVisible = 0x8,
    ReceiveShadows = 0x10
}

export interface BaseAsset {
    id: number;
    baseType: number;
    linkCount: number;
    baseFlags: number;
}

export function readBaseAsset(stream: DataStream): BaseAsset {
    const id = stream.readUInt32();
    const baseType = stream.readUInt8();
    const linkCount = stream.readUInt8();
    const baseFlags = stream.readUInt16();
    return { id, baseType, linkCount, baseFlags };
}

export interface EnvAsset extends BaseAsset {
    bspAssetID: number; // JSP info ID
    startCameraAssetID: number;
    climateFlags: number;
    climateStrengthMin: number;
    climateStrengthMax: number;
    bspLightKit: number; // not used
    objectLightKit: number;
    padF1: number;
    bspCollisionAssetID: number;
    bspFXAssetID: number;
    bspCameraAssetID: number;
    bspMapperID: number;
    bspMapperCollisionID: number;
    bspMapperFXID: number;
    loldHeight: number;
}

export function readEnvAsset(stream: DataStream): EnvAsset {
    const { id, baseType, linkCount, baseFlags } = readBaseAsset(stream);
    const bspAssetID = stream.readUInt32();
    const startCameraAssetID = stream.readUInt32();
    const climateFlags = stream.readUInt32();
    const climateStrengthMin = stream.readFloat();
    const climateStrengthMax = stream.readFloat();
    const bspLightKit = stream.readUInt32();
    const objectLightKit = stream.readUInt32();
    const padF1 = stream.readFloat();
    const bspCollisionAssetID = stream.readUInt32()
    const bspFXAssetID = stream.readUInt32();
    const bspCameraAssetID = stream.readUInt32();
    const bspMapperID = stream.readUInt32()
    const bspMapperCollisionID = stream.readUInt32();
    const bspMapperFXID = stream.readUInt32();
    const loldHeight = stream.readFloat();
    const env: EnvAsset = { id, baseType, linkCount, baseFlags, bspAssetID, startCameraAssetID, climateFlags, climateStrengthMin, climateStrengthMax,
        bspLightKit, objectLightKit, padF1, bspCollisionAssetID, bspFXAssetID, bspCameraAssetID, bspMapperID, bspMapperCollisionID, bspMapperFXID, loldHeight };
    return env;
}

export interface FogAsset extends BaseAsset {
    bkgndColor: Color;
    fogColor: Color;
    fogDensity: number;
    fogStart: number;
    fogStop: number;
    transitionTime: number;
    fogType: number;
    padFog: number[];
}

export function readFogAsset(stream: DataStream): FogAsset {
    const { id, baseType, linkCount, baseFlags } = readBaseAsset(stream);
    const bkgndColor = stream.readColor8();
    const fogColor = stream.readColor8();
    const fogDensity = stream.readFloat();
    const fogStart = stream.readFloat();
    const fogStop = stream.readFloat();
    const transitionTime = stream.readFloat();
    const fogType = stream.readUInt8();
    const padFog: number[] = [0,0,0];
    padFog[0] = stream.readUInt8();
    padFog[1] = stream.readUInt8();
    padFog[2] = stream.readUInt8();
    const fog: FogAsset = { id, baseType, linkCount, baseFlags, bkgndColor,
        fogColor, fogDensity, fogStart, fogStop, transitionTime, fogType, padFog };
    return fog;
}

export interface SurfMatFX {
    flags: number;
    bumpmapID: number;
    envmapID: number;
    shininess: number;
    bumpiness: number;
    dualmapID: number;
}

function readSurfMatFX(stream: DataStream): SurfMatFX {
    const flags = stream.readUInt32();
    const bumpmapID = stream.readUInt32();
    const envmapID = stream.readUInt32();
    const shininess = stream.readFloat();
    const bumpiness = stream.readFloat();
    const dualmapID = stream.readUInt32();
    return { flags, bumpmapID, envmapID, shininess, bumpiness, dualmapID };
}

export interface SurfColorFX {
    flags: number;
    mode: number;
    speed: number;
}

function readSurfColorFX(stream: DataStream): SurfColorFX {
    const flags = stream.readUInt16();
    const mode = stream.readUInt16();
    const speed = stream.readFloat();
    return { flags, mode, speed };
}

export interface SurfTextureAnim {
    pad: number;
    mode: number;
    group: number;
    speed: number;
}

function readSurfTextureAnim(stream: DataStream): SurfTextureAnim {
    const pad = stream.readUInt16();
    const mode = stream.readUInt16();
    const group = stream.readUInt32();
    const speed = stream.readFloat();
    return { pad, mode, group, speed };
}

export interface SurfUVFX {
    mode: number;
    rot: number;
    rot_spd: number;
    trans: vec3;
    trans_spd: vec3;
    scale: vec3;
    scale_spd: vec3;
    min: vec3;
    max: vec3;
    minmax_spd: vec3;
}

function readSurfUVFX(stream: DataStream): SurfUVFX {
    const mode = stream.readInt32();
    const rot = stream.readFloat();
    const rot_spd = stream.readFloat();
    const trans = stream.readVec3();
    const trans_spd = stream.readVec3();
    const scale = stream.readVec3();
    const scale_spd = stream.readVec3();
    const min = stream.readVec3();
    const max = stream.readVec3();
    const minmax_spd = stream.readVec3();
    return { mode, rot, rot_spd, trans, trans_spd, scale, scale_spd, min, max, minmax_spd };
}

export interface SurfAsset extends BaseAsset {
    game_damage_type: number;
    game_sticky: number;
    game_damage_flags: number;
    surf_type: number;
    phys_pad: number;
    sld_start: number;
    sld_stop: number;
    phys_flags: number;
    friction: number;
    matfx: SurfMatFX;
    colorfx: SurfColorFX;
    texture_anim_flags: number;
    texture_anim: SurfTextureAnim[];
    uvfx_flags: number;
    uvfx: SurfUVFX[];
    on: number;
    surf_pad: number[];
    oob_delay: number;
    walljump_scale_xz: number;
    walljump_scale_y: number;
    damage_timer: number;
    damage_bounce: number;
}

export function readSurfAsset(stream: DataStream): SurfAsset {
    const { id, baseType, linkCount, baseFlags } = readBaseAsset(stream);
    const game_damage_type = stream.readUInt8();
    const game_sticky = stream.readUInt8();
    const game_damage_flags = stream.readUInt8();
    const surf_type = stream.readUInt8();
    const phys_pad = stream.readUInt8();
    const sld_start = stream.readUInt8();
    const sld_stop = stream.readUInt8();
    const phys_flags = stream.readUInt8();
    const friction = stream.readFloat();
    const matfx = readSurfMatFX(stream);
    const colorfx = readSurfColorFX(stream);
    const texture_anim_flags = stream.readUInt32();
    const texture_anim: SurfTextureAnim[] = [];
    texture_anim.push(readSurfTextureAnim(stream));
    texture_anim.push(readSurfTextureAnim(stream));
    const uvfx_flags = stream.readUInt32();
    const uvfx: SurfUVFX[] = [];
    uvfx.push(readSurfUVFX(stream));
    uvfx.push(readSurfUVFX(stream));
    const on = stream.readUInt8();
    const surf_pad: number[] = [0,0,0];
    surf_pad[0] = stream.readUInt8();
    surf_pad[1] = stream.readUInt8();
    surf_pad[2] = stream.readUInt8();
    const oob_delay = stream.readFloat();
    const walljump_scale_xz = stream.readFloat();
    const walljump_scale_y = stream.readFloat();
    const damage_timer = stream.readFloat();
    const damage_bounce = stream.readFloat();
    const surf: SurfAsset = { id, baseType, linkCount, baseFlags, game_damage_type, game_sticky, game_damage_flags, surf_type, phys_pad, sld_start, sld_stop, phys_flags,
        friction, matfx, colorfx, texture_anim_flags, texture_anim, uvfx_flags, uvfx, on, surf_pad, oob_delay, walljump_scale_xz, walljump_scale_y, damage_timer, damage_bounce };
    return surf;
}

export const enum EntFlags {
    Visible = 0x1,
    Stackable = 0x2
}

export interface EntAsset extends BaseAsset {
    flags: number;
    subtype: number;
    pflags: number;
    moreFlags: number;
    pad: number;
    surfaceID: number;
    ang: vec3;
    pos: vec3;
    scale: vec3;
    redMult: number;
    greenMult: number;
    blueMult: number;
    seeThru: number;
    seeThruSpeed: number;
    modelInfoID: number;
    animListID: number;
}

export function readEntAsset(stream: DataStream, beta: boolean): EntAsset {
    const { id, baseType, linkCount, baseFlags } = readBaseAsset(stream);
    const flags = stream.readUInt8();
    const subtype = stream.readUInt8();
    const pflags = stream.readUInt8();
    const moreFlags = stream.readUInt8();
    let pad = 0;
    if (!beta) {
        // Beta ent assets don't have this pad field
        pad = stream.readUInt8();
        stream.align(4);
    }
    const surfaceID = stream.readUInt32();
    const ang = stream.readVec3();
    const pos = stream.readVec3();
    const scale = stream.readVec3();
    const redMult = stream.readFloat();
    const greenMult = stream.readFloat();
    const blueMult = stream.readFloat();
    const seeThru = stream.readFloat();
    const seeThruSpeed = stream.readFloat();
    const modelInfoID = stream.readUInt32();
    const animListID = stream.readUInt32();
    return { id, baseType, linkCount, baseFlags, flags, subtype, pflags, moreFlags, pad, surfaceID,
        ang, pos, scale, redMult, greenMult, blueMult, seeThru, seeThruSpeed, modelInfoID, animListID };
}

export interface EntMotionERData {
    ret_pos: vec3;
    ext_dpos: vec3;
    ext_tm: number;
    ext_wait_tm: number;
    ret_tm: number;
    ret_wait_tm: number;
}
export interface EntMotionOrbitData {
    center: vec3;
    w: number;
    h: number;
    period: number;
}
export interface EntMotionSplineData {
    unknown: number;
}
export interface EntMotionMPData {
    flags: number;
    mp_id: number;
    speed: number;
}
export interface EntMotionMechData {
    type: number;
    flags: number;
    sld_axis: number;
    rot_axis: number;
    sld_dist: number;
    sld_tm: number;
    sld_acc_tm: number;
    sld_dec_tm: number;
    rot_dist: number;
    rot_tm: number;
    rot_acc_tm: number;
    rot_dec_tm: number;
    ret_delay: number;
    post_ret_delay: number;
}
export interface EntMotionPenData {
    flags: number;
    plane: number;
    pad: number[];
    len: number;
    range: number;
    period: number;
    phase: number;
}

export const enum EntMotionMechType {
    Slide,
    Rotate,
    SlideAndRotate,
    SlideThenRotate,
    RotateThenSlide
}

export type EntMotionData = EntMotionERData | EntMotionOrbitData | EntMotionSplineData | EntMotionMPData | EntMotionMechData | EntMotionPenData;

export interface EntMotionAsset {
    type: number;
    use_banking: number;
    flags: number;
    data: EntMotionData | undefined;
}

export enum EntMotionType {
    ExtendRetract,
    Orbit,
    Spline,
    MovePoint,
    Mechanism,
    Pendulum,
    None
}

export function readEntMotionAsset(stream: DataStream): EntMotionAsset {
    const type = stream.readUInt8();
    const use_banking = stream.readUInt8();
    const flags = stream.readUInt16();
    let data: EntMotionData | undefined;

    const dataEnd = stream.offset + 0x2C;

    switch (type) {
        case EntMotionType.ExtendRetract: {
            const ret_pos = stream.readVec3();
            const ext_dpos = stream.readVec3();
            const ext_tm = stream.readFloat();
            const ext_wait_tm = stream.readFloat();
            const ret_tm = stream.readFloat();
            const ret_wait_tm = stream.readFloat();
            data = { ret_pos, ext_dpos, ext_tm, ext_wait_tm, ret_tm, ret_wait_tm } as EntMotionERData;
            break;
        }
        case EntMotionType.Orbit: {
            const center = stream.readVec3();
            const w = stream.readFloat();
            const h = stream.readFloat();
            const period = stream.readFloat();
            data = { center, w, h, period } as EntMotionOrbitData;
            break;
        }
        case EntMotionType.Spline: {
            const unknown = stream.readInt32();
            data = { unknown } as EntMotionSplineData;
            break;
        }
        case EntMotionType.MovePoint: {
            const flags = stream.readUInt32();
            const mp_id = stream.readUInt32();
            const speed = stream.readFloat();
            data = { flags, mp_id, speed } as EntMotionMPData;
            break;
        }
        case EntMotionType.Mechanism: {
            const type = stream.readUInt8();
            const flags = stream.readUInt8();
            const sld_axis = stream.readUInt8();
            const rot_axis = stream.readUInt8();
            const sld_dist = stream.readFloat();
            const sld_tm = stream.readFloat();
            const sld_acc_tm = stream.readFloat();
            const sld_dec_tm = stream.readFloat();
            const rot_dist = stream.readFloat();
            const rot_tm = stream.readFloat();
            const rot_acc_tm = stream.readFloat();
            const rot_dec_tm = stream.readFloat();
            const ret_delay = stream.readFloat();
            const post_ret_delay = stream.readFloat();
            data = { type, flags, sld_axis, rot_axis, sld_dist, sld_tm, sld_acc_tm, sld_dec_tm, rot_dist, rot_tm, rot_acc_tm, rot_dec_tm, ret_delay, post_ret_delay } as EntMotionMechData;
            break;
        }
        case EntMotionType.Pendulum: {
            const flags = stream.readUInt8();
            const plane = stream.readUInt8();
            const pad: number[] = [0, 0];
            pad[0] = stream.readUInt8();
            pad[1] = stream.readUInt8();
            const len = stream.readFloat();
            const range = stream.readFloat();
            const period = stream.readFloat();
            const phase = stream.readFloat();
            data = { flags, plane, pad, len, range, period, phase };
            break;
        }
        case EntMotionType.None:
            break;
        default:
            console.warn(`Unknown motion type ${type}`);
    }

    stream.offset = dataEnd;

    return { type, use_banking, flags, data };
}

export enum ButtonActMethod {
    Button,
    PressurePlate
}

export interface ButtonAsset {
    modelPressedInfoID: number;
    actMethod: number;
    initButtonState: number;
    isReset: number;
    resetDelay: number;
    buttonActFlags: number;
}

export function readButtonAsset(stream: DataStream): ButtonAsset {
    const modelPressedInfoID = stream.readUInt32();
    const actMethod = stream.readUInt32();
    const initButtonState = stream.readInt32();
    const isReset = stream.readInt32();
    const resetDelay = stream.readFloat();
    const buttonActFlags = stream.readUInt32();
    return { modelPressedInfoID, actMethod, initButtonState, isReset, resetDelay, buttonActFlags };
}

export interface DestructObjAsset {
    animSpeed: number;
    initAnimState: number;
    health: number;
    spawnItemID: number;
    dflags: number;
    collType: number;
    fxType: number;
    pad: number[];
    blast_radius: number;
    blast_strength: number;
    shrapnelID_destroy: number;
    shrapnelID_hit: number;
    sfx_destroy: number;
    sfx_hit: number;
    hitModel: number;
    destroyModel: number;
}

export function readDestructObjAsset(stream: DataStream): DestructObjAsset {
    const animSpeed = stream.readFloat();
    const initAnimState = stream.readUInt32();
    const health = stream.readUInt32();
    const spawnItemID = stream.readUInt32();
    const dflags = stream.readUInt32();
    const collType = stream.readUInt8();
    const fxType = stream.readUInt8();
    const pad: number[] = [0,0];
    pad[0] = stream.readUInt8();
    pad[1] = stream.readUInt8();
    const blast_radius = stream.readFloat();
    const blast_strength = stream.readFloat();
    const shrapnelID_destroy = stream.readUInt32();
    const shrapnelID_hit = stream.readUInt32();
    const sfx_destroy = stream.readUInt32();
    const sfx_hit = stream.readUInt32();
    const hitModel = stream.readUInt32();
    const destroyModel = stream.readUInt32();
    return { animSpeed, initAnimState, health, spawnItemID, dflags, collType, fxType, pad, blast_radius,
        blast_strength, shrapnelID_destroy, shrapnelID_hit, sfx_destroy, sfx_hit, hitModel, destroyModel };
}

export interface NPCAsset {
    npcFlags: number;
    npcModel: number;
    npcProps: number;
    movepoint: number;
    taskWidgetPrime: number;
    taskWidgetSecond: number;
}

export function readNPCAsset(stream: DataStream): NPCAsset {
    const npcFlags = stream.readInt32();
    const npcModel = stream.readInt32();
    const npcProps = stream.readInt32();
    const movepoint = stream.readUInt32();
    const taskWidgetPrime = stream.readUInt32();
    const taskWidgetSecond = stream.readUInt32();
    return { npcFlags, npcModel, npcProps, movepoint, taskWidgetPrime, taskWidgetSecond };
}

export interface PickupAsset {
    pickupHash: number;
    pickupFlags: number;
    pickupValue: number;
}

export function readPickupAsset(stream: DataStream): PickupAsset {
    const pickupHash = stream.readUInt32();
    const pickupFlags = stream.readUInt16();
    const pickupValue = stream.readUInt16();
    return { pickupHash, pickupFlags, pickupValue };
}

interface PlatformERData { nodata: number;}
interface PlatformOrbitData { nodata: number; }
interface PlatformSplineData { nodata: number; }
interface PlatformMPData { nodata: number; }
interface PlatformMechData { nodata: number; }
interface PlatformPenData { nodata: number; }
interface PlatformConvBeltData {
    speed: number;
}
interface PlatformFallingData {
    speed: number;
    bustModelID: number;
}
interface PlatformFRData {
    fspeed: number;
    rspeed: number;
    ret_delay: number;
    post_ret_delay: number;
}
interface PlatformBreakawayData {
    ba_delay: number;
    bustModelID: number;
    reset_delay: number;
    breakflags: number;
}
interface PlatformSpringboardData {
    jmph: number[];
    jmpbounce: number;
    animID: number[];
    jmpdir: vec3;
    springflags: number;
}
interface PlatformTeeterData {
    itilt: number;
    maxtilt: number;
    invmass: number;
}
interface PlatformPaddleData {
    startOrient: number;
    countOrient: number;
    orientLoop: number;
    orient: number[];
    paddleFlags: number;
    rotateSpeed: number;
    accelTime: number;
    decelTime: number;
    hubRadius: number;
}
interface PlatformFMData { nothingyet: number; }

export type PlatformData = PlatformERData | PlatformOrbitData | PlatformSplineData | PlatformMPData |
    PlatformMechData | PlatformPenData | PlatformConvBeltData | PlatformFallingData | PlatformFRData |
    PlatformBreakawayData | PlatformSpringboardData | PlatformTeeterData | PlatformPaddleData | PlatformFMData;

export enum PlatformType {
    Platform = 0,
    ExtendRetract = 0,
    Orbit,
    Spline,
    MovePoint,
    Mechanism,
    Pendulum,
    ConveyorBelt,
    Falling,
    ForwardReverse,
    Breakaway,
    Springboard,
    TeeterTotter,
    Paddle,
    FullyManipulable
}

export interface PlatformAsset {
    type: number;
    pad: number;
    flags: number;
    data: PlatformData | undefined;
}

export function readPlatformAsset(stream: DataStream): PlatformAsset {
    const type = stream.readUInt8();
    const pad = stream.readUInt8();
    const flags = stream.readUInt16();
    let data: PlatformData | undefined;

    const dataEnd = stream.offset + 0x38;

    switch (type) {
        case PlatformType.ExtendRetract: {
            const nodata = stream.readInt32();
            data = { nodata } as PlatformERData;
            break;
        }
        case PlatformType.Orbit: {
            const nodata = stream.readInt32();
            data = { nodata } as PlatformOrbitData;
            break;
        }
        case PlatformType.Spline: {
            const nodata = stream.readInt32();
            data = { nodata } as PlatformSplineData;
            break;
        }
        case PlatformType.MovePoint: {
            const nodata = stream.readInt32();
            data = { nodata } as PlatformMPData;
            break;
        }
        case PlatformType.Mechanism: {
            const nodata = stream.readInt32();
            data = { nodata } as PlatformMechData;
            break;
        }
        case PlatformType.Pendulum: {
            const nodata = stream.readInt32();
            data = { nodata } as PlatformPenData;
            break;
        }
        case PlatformType.ConveyorBelt: {
            const speed = stream.readFloat();
            data = { speed } as PlatformConvBeltData;
            break;
        }
        case PlatformType.Falling: {
            const speed = stream.readFloat();
            const bustModelID = stream.readUInt32();
            data = { speed, bustModelID } as PlatformFallingData;
            break;
        }
        case PlatformType.ForwardReverse: {
            const fspeed = stream.readFloat();
            const rspeed = stream.readFloat();
            const ret_delay = stream.readFloat();
            const post_ret_delay = stream.readFloat();
            data = { fspeed, rspeed, ret_delay, post_ret_delay } as PlatformFRData;
            break;
        }
        case PlatformType.Breakaway: {
            const ba_delay = stream.readFloat();
            const bustModelID = stream.readUInt32();
            const reset_delay = stream.readFloat();
            const breakflags = stream.readUInt32();
            data = { ba_delay, bustModelID, reset_delay, breakflags } as PlatformBreakawayData;
            break;
        }
        case PlatformType.Springboard: {
            const jmph: number[] = [];
            jmph.push(stream.readFloat());
            jmph.push(stream.readFloat());
            jmph.push(stream.readFloat());
            const jmpbounce = stream.readFloat();
            const animID: number[] = [];
            animID.push(stream.readUInt32());
            animID.push(stream.readUInt32());
            animID.push(stream.readUInt32());
            const jmpdir = stream.readVec3();
            const springflags = stream.readUInt32();
            data = { jmph, jmpbounce, animID, jmpdir, springflags } as PlatformSpringboardData;
            break;
        }
        case PlatformType.TeeterTotter: {
            const itilt = stream.readFloat();
            const maxtilt = stream.readFloat();
            const invmass = stream.readFloat();
            data = { itilt, maxtilt, invmass };
            break;
        }
        case PlatformType.Paddle: {
            const startOrient = stream.readInt32();
            const countOrient = stream.readInt32();
            const orientLoop = stream.readFloat();
            const orient: number[] = [];
            orient.push(stream.readFloat());
            orient.push(stream.readFloat());
            orient.push(stream.readFloat());
            orient.push(stream.readFloat());
            orient.push(stream.readFloat());
            orient.push(stream.readFloat());
            const paddleFlags = stream.readUInt32();
            const rotateSpeed = stream.readFloat();
            const accelTime = stream.readFloat();
            const decelTime = stream.readFloat();
            const hubRadius = stream.readFloat();
            data = { startOrient, countOrient, orientLoop, orient, paddleFlags, rotateSpeed, accelTime, decelTime, hubRadius } as PlatformPaddleData;
            break;
        }
        case PlatformType.FullyManipulable: {
            const nothingyet = stream.readInt32();
            data = { nothingyet } as PlatformFMData;
            break;
        }
        default:
            console.warn(`Unknown platform type ${type}`);
    }

    stream.offset = dataEnd;

    return { type, pad, flags, data };
}

export interface SimpleObjAsset {
    animSpeed: number;
    initAnimState: number;
    collType: number;
    flags: number;
}

export function readSimpleObjAsset(stream: DataStream): SimpleObjAsset {
    const animSpeed = stream.readFloat();
    const initAnimState = stream.readUInt32();
    const collType = stream.readUInt8();
    const flags = stream.readUInt8();
    stream.align(4);
    return { animSpeed, initAnimState, collType, flags };
}

export interface LightKitLight {
    type: number;
    color: Color;
    matrix: mat4;
    radius: number;
    angle: number;
    platLight: number; // RpLight*
}

export interface LightKit {
    tagID: number;
    groupID: number;
    lightCount: number;
    lightList: number; // xLightKitLight*
    lightListArray: LightKitLight[];
}

export function readLightKit(stream: DataStream): LightKit {
    const tagID = stream.readUInt32();
    const groupID = stream.readUInt32();
    const lightCount = stream.readUInt32();
    const lightList = stream.readUInt32();
    const lightListArray: LightKitLight[] = [];
    for (let i = 0; i < lightCount; i++) {
        const type = stream.readUInt32();
        const color = stream.readColor();
        const matrix = stream.readRwMatrix();
        const radius = stream.readFloat();
        const angle = stream.readFloat();
        const platLight = stream.readUInt32();
        lightListArray.push({ type, color, matrix, radius, angle, platLight });
    }
    return { tagID, groupID, lightCount, lightList, lightListArray };
}

export interface ModelInst {
    ModelID: number;
    Flags: number;
    Parent: number;
    Bone: number;
    MatRight: vec3;
    MatUp: vec3;
    MatAt: vec3;
    MatPos: vec3;
}

export interface ModelInfoAsset {
    Magic: number;
    NumModelInst: number;
    AnimTableID: number;
    CombatID: number;
    BrainID: number;
    modelInst: ModelInst[];
}

export function readModelInfo(stream: DataStream): ModelInfoAsset {
    const Magic = stream.readUInt32();
    const NumModelInst = stream.readUInt32();
    const AnimTableID = stream.readUInt32();
    const CombatID = stream.readUInt32();
    const BrainID = stream.readUInt32();
    const modelInst: ModelInst[] = [];
    for (let i = 0; i < NumModelInst; i++) {
        const ModelID = stream.readUInt32();
        const Flags = stream.readUInt16();
        const Parent = stream.readUInt8();
        const Bone = stream.readUInt8();
        const MatRight = stream.readVec3();
        const MatUp = stream.readVec3();
        const MatAt = stream.readVec3();
        const MatPos = stream.readVec3();
        modelInst.push({ ModelID, Flags, Parent, Bone, MatRight, MatUp, MatAt, MatPos });
    }
    return { Magic, NumModelInst, AnimTableID, CombatID, BrainID, modelInst };
}

export interface PickupTableEntry {
    pickupHash: number;
    pickupType: number;
    pickupIndex: number;
    pickupFlags: number;
    quantity: number;
    modelID: number;
    animID: number;
}

export interface PickupTableAsset {
    Magic: number;
    Count: number;
    entries: PickupTableEntry[];
}

export function readPickupTable(stream: DataStream): PickupTableAsset {
    const Magic = stream.readUInt32();
    const Count = stream.readUInt32();
    const entries: PickupTableEntry[] = [];
    for (let i = 0; i < Count; i++) {
        const pickupHash = stream.readUInt32();
        const pickupType = stream.readUInt8();
        const pickupIndex = stream.readUInt8();
        const pickupFlags = stream.readUInt16();
        const quantity = stream.readUInt32();
        const modelID = stream.readUInt32();
        const animID = stream.readUInt32();
        entries.push({ pickupHash, pickupType, pickupIndex, pickupFlags, quantity, modelID, animID });
    }
    return { Magic, Count, entries };
}

export const enum PipeZWriteMode {
    Enabled,
    Disabled,
    Dual
}

export const enum PipeCullMode {
    Unknown0,
    None,
    Back,
    Dual
}

// RwBlendFunction
export const enum PipeBlendFunction {
    NA,
    Zero,
    One,
    SrcColor,
    InvSrcColor,
    SrcAlpha,
    InvSrcAlpha,
    DestAlpha,
    InvDestAlpha,
    DestColor,
    InvDestColor,
    SrcAlphaSat
}

export class PipeInfoFlags {
    constructor(public flags: number) {}

    public get zWriteMode(): PipeZWriteMode {
        return ((this.flags & 0xC) >>> 2);
    }

    public get cullMode(): PipeCullMode {
        return (this.flags & 0x30) >>> 4;
    }

    public get noLighting(): boolean {
        return ((this.flags & 0xC0) >>> 6) == 1;
    }

    public get srcBlend(): PipeBlendFunction {
        return (this.flags & 0xF00) >>> 8;
    }

    public get dstBlend(): PipeBlendFunction {
        return (this.flags & 0xF000) >>> 12;
    }

    public get noFog(): boolean {
        return ((this.flags & 0x10000) >>> 16) === 1;
    }

    public get unknownF00000(): number {
        return (this.flags & 0xF00000) >>> 20;
    }

    public get alphaCompare(): number {
        return (this.flags & 0xFF000000) >>> 24;
    }
}

export interface PipeInfo {
    ModelHashID: number;
    SubObjectBits: number;
    PipeFlags: PipeInfoFlags;
}

export function readPipeInfoTable(stream: DataStream): PipeInfo[] {
    const entryCount = stream.readUInt32();
    const entries: PipeInfo[] = [];
    for (let i = 0; i < entryCount; i++) {
        const ModelHashID = stream.readUInt32();
        const SubObjectBits = stream.readUInt32();
        const PipeFlags = new PipeInfoFlags(stream.readUInt32());
        entries.push({ ModelHashID, SubObjectBits, PipeFlags });
    }
    return entries;
}