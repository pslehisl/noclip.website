typedef unsigned char u8;
typedef unsigned short u16;
typedef unsigned int u32;
typedef unsigned long long u64;
typedef signed char s8;
typedef signed short s16;
typedef signed int s32;
typedef signed long long s64;
typedef float f32;
typedef double f64;
typedef u32 bool32;

/////////////////////////////////
// RenderWare types <rwcore.h> //
/////////////////////////////////

struct RpAtomic;
struct RpLight;

struct RwRGBAReal
{
	f32 red;   // 0x00
	f32 green; // 0x04
	f32 blue;  // 0x08
	f32 alpha; // 0x0C
}; // 0x10

////////////////////////////
// Color types (iColor.h) //
////////////////////////////

struct iColor_tag
{
	u8 r; // 0x00
	u8 g; // 0x01
	u8 b; // 0x02
	u8 a; // 0x03
}; // 0x04

//////////////////////////////
// 2D math types (xMath2.h) //
//////////////////////////////

template <class T>
struct basic_rect
{
	T x;
	T y;
	T w;
	T h;
};

//////////////////////////////
// 3D math types (xMath3.h) //
//////////////////////////////

struct xVec3
{
    f32 x; // 0x00
    f32 y; // 0x04
    f32 z; // 0x08
}; // 0x0C

////////////////////////////////
// Base asset types (xBase.h) //
////////////////////////////////

struct xBaseAsset
{
    u32 id;        // 0x00
    u8 baseType;   // 0x04
    u8 linkCount;  // 0x05
    u16 baseFlags; // 0x06
}; // 0x08

struct xEntAsset : xBaseAsset
{
    u8 flags;         // 0x08
    u8 subtype;       // 0x09
    u8 pflags;        // 0x0A
    u8 moreFlags;     // 0x0B
    u8 pad;           // 0x0C
    u32 surfaceID;    // 0x10
    xVec3 ang;        // 0x14
    xVec3 pos;        // 0x20
    xVec3 scale;      // 0x2C
    f32 redMult;      // 0x38
    f32 greenMult;    // 0x3C
    f32 blueMult;     // 0x40
    f32 seeThru;      // 0x44
    f32 seeThruSpeed; // 0x48
    u32 modelInfoID;  // 0x4C
    u32 animListID;   // 0x50
}; // 0x54

struct xLinkAsset
{
    u16 srcEvent;           // 0x00
    u16 dstEvent;           // 0x02
    u32 dstAssetID;         // 0x04
    f32 param[4];           // 0x08
    u32 paramWidgetAssetID; // 0x18
    u32 chkAssetID;         // 0x1C
}; // 0x20

struct xEntMotionERData
{
	xVec3 ret_pos;   // 0x00
	xVec3 ext_dpos;  // 0x0C
	f32 ext_tm;      // 0x18
	f32 ext_wait_tm; // 0x1C
	f32 ret_tm;      // 0x20
	f32 ret_wait_tm; // 0x24
}; // 0x28

struct xEntMotionOrbitData
{
	xVec3 center; // 0x00
	f32 w;        // 0x0C
	f32 h;        // 0x10
	f32 period;   // 0x14
}; // 0x18

struct xEntMotionSplineData
{
	s32 unknown; // 0x00
}; // 0x04

struct xEntMotionMPData
{
	u32 flags; // 0x00
	u32 mp_id; // 0x04
	f32 speed; // 0x08
}; // 0x0C

struct xEntMotionMechData
{
	u8 type;            // 0x00
	u8 flags;           // 0x01
	u8 sld_axis;        // 0x02
	u8 rot_axis;        // 0x03
	f32 sld_dist;       // 0x04
	f32 sld_tm;         // 0x08
	f32 sld_acc_tm;     // 0x0C
	f32 sld_dec_tm;     // 0x10
	f32 rot_dist;       // 0x14
	f32 rot_tm;         // 0x18
	f32 rot_acc_tm;     // 0x1C
	f32 rot_dec_tm;     // 0x20
	f32 ret_delay;      // 0x24
	f32 post_ret_delay; // 0x28
}; // 0x2C

struct xEntMotionPenData
{
	u8 flags;   // 0x00
	u8 plane;   // 0x01
	u8 pad[2];  // 0x02
	f32 len;    // 0x04
	f32 range;  // 0x08
	f32 period; // 0x0C
	f32 phase;  // 0x10
}; // 0x14

struct xEntMotionAsset
{
	u8 type;        // 0x00
	u8 use_banking; // 0x01
	u16 flags;      // 0x02
	union
	{
		xEntMotionERData er;
		xEntMotionOrbitData orb;
		xEntMotionSplineData spl;
		xEntMotionMPData mp;
		xEntMotionMechData mech;
		xEntMotionPenData pen;
	}; // 0x04
}; // 0x30

////////////////////////
// ALST (zAnimList.h) //
////////////////////////

// ALST asset format:
// - zAnimListAsset

struct zAnimListAsset
{
	u32 ids[10]; // 0x00
}; // 0x28

///////////////////////
// ANIM (iAnimSKB.h) //
///////////////////////

// ANIM asset format:
// - iAnimSKBHeader
// - iAnimSKBKey[iAnimSKBHeader.KeyCount]
// - f32 times[iAnimSKBHeader.TimeCount]
// - u16 offsets[iAnimSKBHeader.TimeCount - 1][iAnimSKBHeader.BoneCount]

struct iAnimSKBHeader
{
    u32 Magic;     // 0x00
	u32 Flags;     // 0x04
	u16 BoneCount; // 0x08
	u16 TimeCount; // 0x0A
	u32 KeyCount;  // 0x0C
	f32 Scale[3];  // 0x10
}; // 0x1C

struct iAnimSKBKey
{
	u16 TimeIndex; // 0x00
	s16 Quat[4];   // 0x02
	s16 Tran[3];   // 0x0A
}; // 0x10

/////////////////////////
// ATBL (xAnimTable.h) //
/////////////////////////

// ATBL asset format:
// - xAnimAssetTable zaTbl
// - void** zaRaw[zaTbl.NumRaw] // ANIM IDs, gets converted to xAnimFile**
// - xAnimAssetFile zaFile[zaTbl.NumFiles]
// - xAnimAssetState zaState[zaTbl.NumStates]
// - xAnimAssetEffect zaEffect[sum of all zaState.EffectCount]
// - void* rawData[zaTbl.NumRaw] // null (i think), gets converted to xAnimFile*

struct xAnimAssetTable
{
	u32 Magic;         // 0x00
	u32 NumRaw;        // 0x04
	u32 NumFiles;      // 0x08
	u32 NumStates;     // 0x0C
	u32 ConstructFunc; // 0x10
}; // 0x14

struct xAnimAssetFile
{
	u32 FileFlags;   // 0x00
	f32 Duration;    // 0x04
	f32 TimeOffset;  // 0x08
	u16 NumAnims[2]; // 0x0C - maps to numX, numY in xAnimFileNewBilinear()
	void** RawData;  // 0x10 - offset from start of ATBL asset
	s32 Physics;     // 0x14
	s32 StartPose;   // 0x18
	s32 EndPose;     // 0x1C
}; // 0x20

struct xAnimAssetState
{
	u32 StateID;       // 0x00
	u32 FileIndex;     // 0x04
	u32 EffectCount;   // 0x08
	u32 EffectOffset;  // 0x0C - offset from start of ATBL asset
	f32 Speed;         // 0x10
	u32 SubStateID;    // 0x14
	u32 SubStateCount; // 0x18
}; // 0x1C

struct xAnimAssetEffect
{
	u32 StateID;      // 0x00
	f32 StartTime;    // 0x04
	f32 EndTime;      // 0x08
	u32 Flags;        // 0x0C
	u32 EffectType;   // 0x10
	u32 UserDataSize; // 0x14
}; // 0x18

//////////////////////////
// BOUL (xEntBoulder.h) //
//////////////////////////

// BOUL asset format:
// - xEntAsset
// - xEntBoulderAsset
// - xLinkAsset[xEntAsset.linkCount]

struct xEntBoulderAsset
{
	f32 gravity;     // 0x00
	f32 mass;        // 0x04
	f32 bounce;      // 0x08
	f32 friction;    // 0x0C
	f32 statFric;    // 0x10
	f32 maxVel;      // 0x14
	f32 maxAngVel;   // 0x18
	f32 stickiness;  // 0x1C
	f32 bounceDamp;  // 0x20
	u32 flags;       // 0x24
	f32 killtimer;   // 0x28
	u32 hitpoints;   // 0x2C
	u32 soundID;     // 0x30
	f32 volume;      // 0x34
	f32 minSoundVel; // 0x38
	f32 maxSoundVel; // 0x3C
	f32 innerRadius; // 0x40
	f32 outerRadius; // 0x44
}; // 0x48

/////////////////////////
// BUTN (zEntButton.h) //
/////////////////////////

// BUTN asset format:
// - xEntAsset
// - zEntButtonAsset
// - xEntMotionAsset
// - xLinkAsset[xEntAsset.linkCount]

struct zEntButtonAsset
{
	u32 modelPressedInfoID; // 0x00
	u32 actMethod;          // 0x04
	s32 initButtonState;    // 0x08
	s32 isReset;            // 0x0C
	f32 resetDelay;         // 0x10
	u32 buttonActFlags;     // 0x14
}; // 0x18

////////////////////////
// CAM (zCamMarker.h) //
////////////////////////

// CAM asset format:
// - xCamAsset
// - xLinkAsset[xCamAsset.linkCount]

enum _tagTransType {
    eTransType_None,
	eTransType_Interp1,
	eTransType_Interp2,
	eTransType_Interp3,
	eTransType_Interp4,
	eTransType_Linear,
	eTransType_Interp1Rev,
	eTransType_Interp2Rev,
	eTransType_Interp3Rev,
	eTransType_Interp4Rev,
	eTransType_Total
};

struct _tagxCamFollowAsset
{
	f32 rotation;    // 0x00
	f32 distance;    // 0x04
	f32 height;      // 0x08
	f32 rubber_band; // 0x0C
	f32 start_speed; // 0x10
	f32 end_speed;   // 0x14
}; // 0x18

struct _tagxCamShoulderAsset
{
	f32 distance;      // 0x00
	f32 height;        // 0x04
	f32 realign_speed; // 0x08
	f32 realign_delay; // 0x0C
}; // 0x10

struct _tagp2CamStaticAsset
{
	u32 unused; // 0x00
}; // 0x04

struct _tagxCamPathAsset
{
	u32 assetID;    // 0x00
	f32 time_end;   // 0x04
	f32 time_delay; // 0x08
}; // 0x0C

struct _tagp2CamStaticFollowAsset
{
	f32 rubber_band; // 0x00
}; // 0x04

struct xCamAsset : xBaseAsset {
    xVec3 pos;                // 0x08
    xVec3 at;                 // 0x14
    xVec3 up;                 // 0x20
    xVec3 right;              // 0x2C
    xVec3 view_offset;        // 0x38
    s16 offset_start_frames;  // 0x44
    s16 offset_end_frames;    // 0x46
    f32 fov;                  // 0x48
    f32 trans_time;           // 0x4C
    _tagTransType trans_type; // 0x50
    u32 flags;                // 0x54
    f32 fade_up;              // 0x58
    f32 fade_down;            // 0x5C
    union {
        _tagxCamFollowAsset cam_follow;
        _tagxCamShoulderAsset cam_shoulder;
        _tagp2CamStaticAsset cam_static;
        _tagxCamPathAsset cam_path;
        _tagp2CamStaticFollowAsset cam_staticFollow;
    };                        // 0x60
    u32 valid_flags;          // 0x78
    u32 markerid[2];          // 0x7C
    u8 cam_type;              // 0x84
    u8 pad[3];                // 0x85
}; // 0x88

///////////////////////
// CNTR (xCounter.h) //
///////////////////////

// CNTR asset format:
// - xCounterAsset
// - xLinkAsset[xCounterAsset.linkCount]

struct xCounterAsset : xBaseAsset
{
	s16 count; // 0x08
}; // 0x0C

////////////////////////
// COLL (zCollGeom.h) //
////////////////////////

// COLL asset format:
// - u32 tableCount
// - zCollGeomTable[tableCount]

struct zCollGeomTable
{
	RpAtomic* baseModel;   // 0x00 - MODL asset ID
	RpAtomic* colModel[1]; // 0x04 - MODL asset ID
	RpAtomic* camcolModel; // 0x08 - MODL asset ID
}; // 0x0C

///////////////////////////
// COND (zConditional.h) //
///////////////////////////

// COND asset format:
// - zCondAsset
// - xLinkAsset[zCondAsset.linkCount]

struct zCondAsset : xBaseAsset
{
	u32 constNum;    // 0x08
	u32 expr1;       // 0x0C
	u32 op;          // 0x10
	u32 value_asset; // 0x14
}; // 0x18

//////////////////
// CRDT (xCM.h) //
//////////////////

// CRDT asset format:
// - xCMheader
// - repeat till end of file:
//   - xCMcredits
//   - xCMpreset[xCMcredits.num_presets]
//   - repeat till xCMcredits.credits_size:
//     - xCMhunk

struct sxy
{
	f32 x; // 0x00
	f32 y; // 0x04
}; // 0x08

struct fade
{
	f32 start; // 0x00
	f32 end;   // 0x04
}; // 0x08

struct xCMheader
{
	u32 magic;      // 0x00
	u32 version;    // 0x04
	u32 crdID;      // 0x08
	u32 state;      // 0x0C
	f32 total_time; // 0x10
	u32 total_size; // 0x14
}; // 0x18

struct xCMcredits
{
	u32 credits_size; // 0x00
	f32 len;          // 0x04
	u32 flags;        // 0x08
	sxy in;           // 0x0C
	sxy out;          // 0x14
	f32 scroll_rate;  // 0x1C
	f32 lifetime;     // 0x20
	fade fin;         // 0x24
	fade fout;        // 0x2C
	u32 num_presets;  // 0x34
}; // 0x38

struct xCMtextbox
{
	u32 font;         // 0x00
	iColor_tag color; // 0x04
	sxy char_size;    // 0x08
	sxy char_spacing; // 0x10
	sxy box;          // 0x18
}; // 0x20

struct xCMpreset
{
	u16 num;           // 0x00
	u16 align;         // 0x02
	f32 delay;         // 0x04
	f32 innerspace;    // 0x08
	xCMtextbox box[2]; // 0x0C
}; // 0x4C

struct xCMhunk
{
	u32 hunk_size; // 0x00
	u32 preset;    // 0x04
	f32 t0;        // 0x08
	f32 t1;        // 0x0C
	char* text1;   // 0x10 - offset from start of CRDT asset
	char* text2;   // 0x14 - offset from start of CRDT asset
}; // 0x18

///////////////////////
// CSN (xCutscene.h) //
///////////////////////

// CSN asset format: unknown

///////////////////////////
// CSNM (xCutsceneMgr.h) //
///////////////////////////

// CSNM asset format:
// xCutsceneMgrAsset
// xLinkAsset[xCutsceneMgrAsset.linkCount]

struct xCutsceneMgrAsset : xBaseAsset
{
	u32 cutsceneAssetID; // 0x08
	u32 flags;           // 0x0C
	f32 interpSpeed;     // 0x10
	f32 startTime[15];   // 0x14
	f32 endTime[15];     // 0x50
	u32 emitID[15];      // 0x8C
}; // 0xC8

////////////////////////
// CTOC (xCutscene.h) //
////////////////////////

// CTOC asset format:
// - u32 count
// - repeat count:
//   - xCutsceneInfo
//   - xCutsceneData[xCutsceneInfo.NumData]
//   - unknown

struct xCutsceneInfo
{
	u32 Magic;           // 0x00
	u32 AssetID;         // 0x04
	u32 NumData;         // 0x08
	u32 NumTime;         // 0x0C
	u32 MaxModel;        // 0x10
	u32 MaxBufEven;      // 0x14
	u32 MaxBufOdd;       // 0x18
	u32 HeaderSize;      // 0x1C
	u32 VisCount;        // 0x20
	u32 VisSize;         // 0x24
	u32 BreakCount;      // 0x28
	u32 pad;             // 0x2C
	char SoundLeft[16];  // 0x30
	char SoundRight[16]; // 0x40
}; // 0x50

struct xCutsceneData
{
	u32 DataType;       // 0x00
	u32 AssetID;        // 0x04
	u32 ChunkSize;      // 0x08
	union
	{
		u32 FileOffset;
		void* DataPtr;
	}; // 0x0C
}; // 0x10

struct xCutsceneBreak
{
	f32 Time;  // 0x00
	s32 Index; // 0x04
}; // 0x08

struct xCutsceneTime
{
	f32 StartTime;  // 0x00
	f32 EndTime;    // 0x04
	u32 NumData;    // 0x08
	u32 ChunkIndex; // 0x0C
}; // 0x10

//////////////////////////
// DPAT (zDispatcher.h) //
//////////////////////////

// DPAT asset format:
// - xBaseAsset
// - xLinkAsset[xBaseAsset.linkCount]

//////////////////////////
// DSCO (zDiscoFloor.h) //
//////////////////////////

// DSCO asset format:
// - z_disco_floor_asset
// - xLinkAsset[z_disco_floor_asset.linkCount]
// - unknown

struct z_disco_floor_asset : xBaseAsset
{
	u32 flags;                                         // 0x08
	struct { f32 transition, state; } interval;        // 0x0C
	struct { u32 off, transition, on; } prefix_offset; // 0x14
	u32 state_mask_size;                               // 0x20
	u32 states_offset;                                 // 0x24
	u32 states_size;                                   // 0x28
}; // 0x24

//////////////////////////////
// DSTR (zEntDestructObj.h) //
//////////////////////////////

// DSTR asset format:
// - xEntAsset
// - zEntDestructObjAsset
// - xLinkAsset[xEntAsset.linkCount]

struct zEntDestructObjAsset
{
	f32 animSpeed;          // 0x00
	u32 initAnimState;      // 0x04
	u32 health;             // 0x08
	u32 spawnItemID;        // 0x0C
	u32 dflags;             // 0x10
	u8 collType;            // 0x14
	u8 fxType;              // 0x15
	u8 pad[2];              // 0x16
	f32 blast_radius;       // 0x18
	f32 blast_strength;     // 0x1C
	u32 shrapnelID_destroy; // 0x20
	u32 shrapnelID_hit;     // 0x24
	u32 sfx_destroy;        // 0x28
	u32 sfx_hit;            // 0x2C
	u32 hitModel;           // 0x30
	u32 destroyModel;       // 0x34
}; // 0x38

///////////////////
// DYNA (xDyn.h) //
///////////////////

struct xDynAsset : xBaseAsset
{
	u32 type;    // 0x08
	u16 version; // 0x0C
	u16 handle;  // 0x0E
}; // 0x10

// xHud.h

namespace xhud
{
    struct asset : xDynAsset
    {
        xVec3 loc;  // 0x10
        xVec3 size; // 0x1C
    }; // 0x28
}

// xHudMeter.h

namespace xhud
{
    struct meter_asset : asset
    {
        f32 start_value;         // 0x28
        f32 min_value;           // 0x2C
        f32 max_value;           // 0x30
        f32 increment_time;      // 0x34
        f32 decrement_time;      // 0x38
        struct
        {
            u32 start_increment; // 0x3C
            u32 increment;       // 0x40
            u32 start_decrement; // 0x44
            u32 decrement;       // 0x48
        } sound;
    }; // 0x4C
}

// xEntBoulder.h

// DYNA asset format:
// - xBoulderGeneratorAsset
// - xLinkAsset[xBoulderGeneratorAsset.linkCount]

struct xBoulderGeneratorAsset : xDynAsset
{
	u32 object;       // 0x10
	xVec3 offset;     // 0x14
	f32 offsetRand;   // 0x20
	xVec3 initvel;    // 0x24
	f32 velAngleRand; // 0x30
	f32 velMagRand;   // 0x34
	xVec3 initaxis;   // 0x38
	f32 angvel;       // 0x44
}; // 0x48

// zEntPlayerBungeeState.h

namespace bungee_state
{
    // DYNA asset format
    // - drop_asset
    // - xLinkAsset[drop_asset.linkCount]

    struct drop_asset : xDynAsset
    {
        u32 marker;         // 0x10
        u32 set_view_angle; // 0x14
        f32 view_angle;     // 0x18
    }; // 0x1C

    // DYNA asset format
    // - hook_asset
    // - xLinkAsset[hook_asset.linkCount]

    struct hook_asset : xDynAsset
    {
        u32 entity;   // 0x10
        xVec3 center; // 0x14
        struct
        {
            f32 dist;        // 0x20
            f32 travel_time; // 0x24
        } attach;
        struct
        {
            f32 dist;           // 0x28
            f32 free_fall_time; // 0x2C
            f32 accel;          // 0x30
        } detach;
        struct
        {
            f32 unused1; // 0x34
            f32 unused2; // 0x38
        } turn;
        struct
        {
            f32 frequency; // 0x3C
            f32 gravity;   // 0x40
            f32 dive;      // 0x44
            f32 min_dist;  // 0x48
            f32 max_dist;  // 0x4C
            f32 damp;      // 0x50
        } vertical;
        struct
        {
            f32 max_dist; // 0x54
        } horizontal;
        struct
        {
            f32 rest_dist;  // 0x58
            f32 view_angle; // 0x5C
            f32 offset;     // 0x60
            f32 offset_dir; // 0x64
            f32 turn_speed; // 0x68
            f32 vel_scale;  // 0x6C
            f32 roll_speed; // 0x70
            xVec3 unused1;  // 0x74
        } camera;
        struct
        {
            f32 hit_loss;        // 0x80
            f32 damage_velocity; // 0x84
            f32 hit_velocity;    // 0x88
        } collision;
    }; // 0x8C
}

// zBusStop.h

// DYNA asset format:
// - busstop_asset
// - xLinkAsset[busstop_asset.linkCount]

struct busstop_asset : xDynAsset
{
	u32 marker;    // 0x10
	u32 character; // 0x14
	u32 cameraID;  // 0x18
	u32 busID;     // 0x1C
	f32 delay;     // 0x20
}; // 0x24

// zCameraTweak.h

// DYNA asset format:
// - CameraTweak_asset
// - xLinkAsset[CameraTweak_asset.linkCount]

struct CameraTweak_asset : xDynAsset
{
	s32 priority;     // 0x10
	f32 time;         // 0x14
	f32 pitch_adjust; // 0x18
	f32 dist_adjust;  // 0x1C
}; // 0x20

// zCameraFly.h

// DYNA asset format:
// - CameraFly_asset
// - xLinkAsset[CameraFly_asset.linkCount]

struct CameraFly_asset : xDynAsset
{
	u32 flyID; // 0x10
}; // 0x14

// zNPCTypeCommon.h

// DYNA asset format:
// - zNPCSettings
// - xLinkAsset[zNPCSettings.linkCount]

enum en_npcbtyp
{
	NPCP_BASIS_NONE,
	NPCP_BASIS_EVILROBOT,
	NPCP_BASIS_FRIENDLYROBOT,
	NPCP_BASIS_LOVINGCITIZEN,
	NPCP_BASIS_GRUMPYCITIZEN,
	NPCP_BASIS_NOMORE,
	NPCP_BASIS_FORCE = 0x7fffffff
};

enum en_dupowavmod
{
	NPCP_DUPOWAVE_CONTINUOUS,
	NPCP_DUPOWAVE_DISCREET,
	NPCP_DUPOWAVE_NOMORE,
	NPCP_DUPOWAVE_FORCE = 0x7fffffff
};

struct zNPCSettings : xDynAsset
{
	en_npcbtyp basisType;        // 0x10
	s8 allowDetect;              // 0x14
	s8 allowPatrol;              // 0x15
	s8 allowWander;              // 0x16
	s8 reduceCollide;            // 0x17
	s8 useNavSplines;            // 0x18
	s8 pad[3];                   // 0x19
	s8 allowChase;               // 0x1C
	s8 allowAttack;              // 0x1D
	s8 assumeLOS;                // 0x1E
	s8 assumeFOV;                // 0x1F
	en_dupowavmod duploWaveMode; // 0x20
	f32 duploSpawnDelay;         // 0x24
	s32 duploSpawnLifeMax;       // 0x28
}; // 0x2C

// zTalkBox.h

// DYNA asset format:
// - ztalkbox::asset_type
// - xLinkAsset[ztalkbox::asset_type.linkCount]

struct ztalkbox {
    struct asset_type : xDynAsset
    {
        u32 dialog_box;  // 0x10
        u32 prompt_box;  // 0x14
        u32 quit_box;    // 0x18
        u8 trap;         // 0x1C
        u8 pause;        // 0x1D
        u8 allow_quit;   // 0x1E
        u8 trigger_pads; // 0x1F
        u8 page;         // 0x20
        u8 show;         // 0x21
        u8 hide;         // 0x22
        u8 audio_effect; // 0x23
        u32 teleport;    // 0x24
        struct
        {
            struct
            {
                u8 time;   // 0x28
                u8 prompt; // 0x29
                u8 sound;  // 0x2A
                u8 event;  // 0x2B
            } type;
            float delay;     // 0x2C
            int which_event; // 0x30
        } auto_wait;
        struct
        {
            unsigned int skip;   // 0x34
            unsigned int noskip; // 0x38
            unsigned int quit;   // 0x3C
            unsigned int noquit; // 0x40
            unsigned int yesno;  // 0x44
        } prompt;
    }; // 0x48
};

// zTaskBox.h

// DYNA asset format:
// - ztaskbox::asset_type
// - xLinkAsset[ztaskbox::asset_type.linkCount]

struct ztaskbox {
    struct asset_type : xDynAsset
    {
        u8 persistent; // 0x10
        u8 loop;       // 0x11
        u8 enable;     // 0x12
        u8 retry;      // 0x13
        u32 talk_box;  // 0x14
        u32 next_task; // 0x18
        u32 stages[6]; // 0x1C
    }; // 0x34
};

// zTaxi.h

// DYNA asset format:
// - taxi_asset
// - xLinkAsset[taxi_asset.linkCount]

struct taxi_asset : xDynAsset
{
	u32 marker;      // 0x10
	u32 cameraID;    // 0x14
	u32 portalID;    // 0x18
	u32 talkBoxID;   // 0x1C
	u32 textID;      // 0x20
	u32 taxiID;      // 0x24
	f32 invDelay;    // 0x28
	f32 portalDelay; // 0x2C
}; // 0x30

// zEntTeleportBox.h

// DYNA asset format:
// - teleport_asset
// - xLinkAsset[teleport_asset.linkCount]

struct teleport_asset : xDynAsset
{
	u32 marker;      // 0x10
	u32 opened;      // 0x14
	u32 launchAngle; // 0x18
	u32 camAngle;    // 0x1C
	u32 targetID;    // 0x20
}; // 0x24

// zTextBox.h

// DYNA asset format:
// - ztextbox::asset_type
// - xLinkAsset[ztextbox::asset_type.linkCount]

struct ztextbox
{
    struct asset_type : xDynAsset
    {
        struct color_type
        {
            u8 r; // 0x00
            u8 g; // 0x01
            u8 b; // 0x02
            u8 a; // 0x03
        }; // 0x04

        u32 text;                                          // 0x10
        basic_rect<f32> bounds;                            // 0x14
        u32 font;                                          // 0x24
        struct { f32 width, height; } size;                // 0x28
        struct { f32 x, y; } space;                        // 0x30
        color_type color;                                  // 0x38
        struct { f32 left, top, right, bottom; } inset;    // 0x3C
        enum { XJ_LEFT, XJ_CENTER, XJ_RIGHT } xjustify;    // 0x4C
        enum { EX_UP, EX_CENTER, EX_DOWN, MAX_EX } expand; // 0x50
        f32 max_height;                                    // 0x54
        struct
        {
            u32 type;         // 0x58
            color_type color; // 0x5C
            u32 texture;      // 0x60
        } backdrop;
    }; // 0x64
};

// DYNA asset format:
// - pointer_asset
// - xLinkAsset[pointer_asset.linkCount]

struct pointer_asset : xDynAsset
{
	xVec3 loc; // 0x10
	f32 yaw;   // 0x1C
	f32 pitch; // 0x20
	f32 roll;  // 0x24
}; // 0x28

// xHudFontMeter.h

// DYNA asset format:
// - xhud::font_meter_asset
// - xLinkAsset[xhud::font_meter_asset.linkCount]

namespace xhud
{
    struct color32u
    {
        u8 r; // 0x00
        u8 g; // 0x01
        u8 b; // 0x02
        u8 a; // 0x03
    }; // 0x04

    struct font_context
    {
        u32 id;          // 0x00
        s32 justify;     // 0x04
        f32 w;           // 0x08
        f32 h;           // 0x0C
        f32 space;       // 0x10
        f32 drop_x;      // 0x14
        f32 drop_y;      // 0x18
        color32u c;      // 0x1C
        color32u drop_c; // 0x20
    }; // 0x24

    struct font_meter_asset : meter_asset
    {
        font_context font; // 0x4C
        u8 counter_mode;   // 0x70
        u8 pad1;           // 0x71
        u8 pad2;           // 0x72
        u8 pad3;           // 0x73
    }; // 0x74
}

// xHudUnitMeter.h

// DYNA asset format:
// - xhud::unit_meter_asset
// - xLinkAsset[xhud::unit_meter_asset.linkCount]

namespace xhud
{
    struct model_info
    {
        u32 id;     // 0x00
        xVec3 loc;  // 0x04
        xVec3 size; // 0x10
    }; // 0x1C

    struct unit_meter_asset : meter_asset
    {
        model_info model[2]; // 0x4C
        xVec3 offset;        // 0x84
        u32 fill_forward;    // 0x90
    }; // 0x94
}

// xHudModel.h

// DYNA asset format:
// - xhud::model_asset
// - xLinkAsset[xhud::model_asset.linkCount]

namespace xhud
{
    struct model_asset : asset
    {
        u32 model; // 0x28
    }; // 0x2C
}

// xHudText.h

// DYNA asset format:
// - xhud::text_asset
// - xLinkAsset[xhud::text_asset.linkCount]

namespace xhud
{
    struct text_asset : asset
    {
        u32 text_box; // 0x28
        u32 text;     // 0x2C
    }; // 0x30
}

//////////////////////////
// EGEN (zEGenerator.h) //
//////////////////////////

// EGEN asset format:
// - zEGenAsset
// - xLinkAsset[zEGenAsset.linkCount]

struct zEGenAsset : xEntAsset
{
	xVec3 src_dpos; // 0x54
	u8 damage_type; // 0x60
	u8 flags;       // 0x64
	f32 ontime;     // 0x68
	u32 onAnimID;   // 0x6C
}; // 0x70

//////////////////
// ENV (xEnv.h) //
//////////////////

// ENV asset format:
// - xEnvAsset
// - xLinkAsset[xEnvAsset.linkCount]

struct xEnvAsset : xBaseAsset
{
	u32 bspAssetID;           // 0x08
	u32 startCameraAssetID;   // 0x0C
	u32 climateFlags;         // 0x10
	f32 climateStrengthMin;   // 0x14
	f32 climateStrengthMax;   // 0x18
	u32 bspLightKit;          // 0x1C
	u32 objectLightKit;       // 0x20
	f32 padF1;                // 0x24
	u32 bspCollisionAssetID;  // 0x28
	u32 bspFXAssetID;         // 0x2C
	u32 bspCameraAssetID;     // 0x30
	u32 bspMapperID;          // 0x34
	u32 bspMapperCollisionID; // 0x38
	u32 bspMapperFXID;        // 0x3C
	f32 loldHeight;           // 0x40
}; // 0x44

/////////////////////
// FLY (zCamera.h) //
/////////////////////

// FLY asset format:
// - repeat till end of file:
//   - zFlyKey

struct zFlyKey
{
	s32 frame;       // 0x00
	f32 matrix[12];  // 0x04
	f32 aperture[2]; // 0x34
	f32 focal;       // 0x3C
}; // 0x40

//////////////////
// FOG (xFog.h) //
//////////////////

// FOG asset format:
// - xFogAsset
// - xLinkAsset[xFogAsset.linkCount]

struct xFogAsset : xBaseAsset
{
	u8 bkgndColor[4];   // 0x08
	u8 fogColor[4];     // 0x0C
	f32 fogDensity;     // 0x10
	f32 fogStart;       // 0x14
	f32 fogStop;        // 0x18
	f32 transitionTime; // 0x1C
	u8 fogType;         // 0x20
	u8 padFog[3];       // 0x21
}; // 0x24

/////////////////////
// GRUP (xGroup.h) //
/////////////////////

// GRUP asset format:
// - xGroupAsset
// - xLinkAsset[xGroupAsset.linkCount]

struct xGroupAsset : xBaseAsset
{
	u16 itemCount;  // 0x08
	u16 groupFlags; // 0x0A
}; // 0x0C

//////////////////
// JAW (xJaw.h) //
//////////////////

// JAW asset format:
// - u32 jawcount
// - xJawDataTable[jawcount]
// - repeat jawcount:
//   - u32 dataLength
//   - u8 data[dataLength]
//   - pad to 4 byte alignment

struct xJawDataTable
{
	u32 soundHashID; // 0x00
	u32 dataStart;   // 0x04
	u32 dataLength;  // 0x08
}; // 0x0C

//////////////////
// JSP (xJSP.h) //
//////////////////

// Normal JSP asset format: RpClump
// JSP Info asset format: RW stream with custom chunk types (0xBEEF01, 0xBEEF02, 0xBEEF03)

////////////////////////
// LKIT (xLightKit.h) //
////////////////////////

// LKIT asset format:
// - xLightKit
// - xLightKitLight[xLightKit.lightCount]

struct xLightKitLight
{
	u32 type;           // 0x00
	RwRGBAReal color;   // 0x04
	f32 matrix[16];     // 0x14
	f32 radius;         // 0x54
	f32 angle;          // 0x58
	RpLight* platLight; // 0x5C
}; // 0x60

struct xLightKit
{
	u32 tagID;                 // 0x00
	u32 groupID;               // 0x04
	u32 lightCount;            // 0x08
	xLightKitLight* lightList; // 0x0C
}; // 0x10

///////////////////
// LODT (zLOD.h) //
///////////////////

// LODT asset format:
// - u32 lodCount
// - zLodTable[lodCount]

struct xModelBucket;

struct zLODTable
{
	xModelBucket** baseBucket;   // 0x00 - MODL asset ID
	f32 noRenderDist;            // 0x04
	xModelBucket** lodBucket[3]; // 0x08 - MODL asset IDs
	f32 lodDist[3];              // 0x14
}; // 0x20

///////////////////////
// MAPR (zSurface.h) //
///////////////////////

// MAPR asset format:
// - zMaterialMapAsset
// - zMaterialMapEntry[zMaterialMapAsset.count]

struct zMaterialMapAsset
{
	u32 id;    // 0x00
	u32 count; // 0x04
}; // 0x08

struct zMaterialMapEntry
{
	u32 surfaceAssetID; // 0x00
	u32 materialIndex;  // 0x04
}; // 0x08

/////////////////////
// MINF (xModel.h) //
/////////////////////

// MINF asset format:
// - xModelAssetInfo
// - xModelAssetInst[xModelAssetInfo.NumModelInst]

struct xModelAssetInfo
{
	u32 Magic;        // 0x00
	u32 NumModelInst; // 0x04
	u32 AnimTableID;  // 0x08
	u32 CombatID;     // 0x0C
	u32 BrainID;      // 0x10
}; // 0x14

struct xModelAssetInst
{
	u32 ModelID;     // 0x00
	u16 Flags;       // 0x04
	u8 Parent;       // 0x06
	u8 Bone;         // 0x07
	f32 MatRight[3]; // 0x08
	f32 MatUp[3];    // 0x14
	f32 MatAt[3];    // 0x20
	f32 MatPos[3];   // 0x2C
}; // 0x38

//////////
// MODL //
//////////

// MODL asset format: RpClump

//////////////////////
// MRKR (xMarker.h) //
//////////////////////

// MRKR asset format:
// - xMarkerAsset

struct xMarkerAsset
{
	xVec3 pos; // 0x00
};

/////////////////////////
// MVPT (xMovePoint.h) //
/////////////////////////

// MVPT asset format:
// - xMovePointAsset
// - u32 pointIDs[xMovePointAsset.numPoints]
// - xLinkAsset[xMovePointAsset.linkCount]

struct xMovePointAsset : xBaseAsset
{
	xVec3 pos;       // 0x08
	u16 wt;          // 0x14
	u8 on;           // 0x16
	u8 bezIndex;     // 0x17
	u8 flg_props;    // 0x18
	u8 pad;          // 0x19
	u16 numPoints;   // 0x1A
	f32 delay;       // 0x1C
	f32 zoneRadius;  // 0x20
	f32 arenaRadius; // 0x24
}; // 0x28

//////////////////////////
// PARE (xParEmitter.h) //
//////////////////////////

// PARE asset format:
// - xParEmitterAsset
// - xLinkAsset[xParEmitterAsset.linkCount]

struct xPECircle
{
	f32 radius;     // 0x00
	f32 deflection; // 0x04
	xVec3 dir;      // 0x08
}; // 0x14

struct _tagEmitSphere
{
	f32 radius; // 0x00
}; // 0x04

struct _tagEmitRect
{
	f32 x_len; // 0x00
	f32 z_len; // 0x04
}; // 0x08

struct _tagEmitLine
{
	xVec3 pos1; // 0x00
	xVec3 pos2; // 0x0C
	f32 radius; // 0x18
}; // 0x1C

struct _tagEmitVolume
{
	u32 emit_volumeID; // 0x00
}; // 0x04

struct _tagEmitOffsetPoint
{
	xVec3 offset; // 0x00
}; // 0x0C

struct xPEVCyl
{
	f32 height;     // 0x00
	f32 radius;     // 0x04
	f32 deflection; // 0x08
}; // 0x0C

struct xPEEntBone
{
	u8 flags;       // 0x00
	u8 type;        // 0x01
	u8 bone;        // 0x02
	u8 pad1;        // 0x03
	xVec3 offset;   // 0x04
	f32 radius;     // 0x10
	f32 deflection; // 0x14
}; // 0x18

struct xPEEntBound
{
	u8 flags;       // 0x00
	u8 type;        // 0x01
	u8 pad1;        // 0x02
	u8 pad2;        // 0x03
	f32 expand;     // 0x04
	f32 deflection; // 0x08
}; // 0x0C

struct xParEmitterAsset : xBaseAsset
{
	u8 emit_flags; // 0x08
	u8 emit_type;  // 0x09
	u16 pad;       // 0x0A
	u32 propID;    // 0x0C
	union
	{
		xPECircle e_circle;
		_tagEmitSphere e_sphere;
		_tagEmitRect e_rect;
		_tagEmitLine e_line;
		_tagEmitVolume e_volume;
		_tagEmitOffsetPoint e_offsetp;
		xPEVCyl e_vcyl;
		xPEEntBone e_entbone;
		xPEEntBound e_entbound;
	}; // 0x10
	u32 attachToID;   // 0x3C
	xVec3 pos;                 // 0x40
	xVec3 vel;                 // 0x4C
	f32 vel_angle_variation; // 0x58
	u32 cull_mode;    // 0x5C
	f32 cull_dist_sqr;       // 0x60
}; // 0x64

//////////////////////////
// PARP (xParEmitter.h) //
//////////////////////////

// PARP asset format:
// - xParEmitterPropsAsset
// - xLinkAsset[xParEmitterPropsAsset.linkCount]

struct xParInterp
{
	f32 val[2]; // 0x00
	u32 interp; // 0x08
	f32 freq;   // 0x0C
	f32 oofreq; // 0x10
}; // 0x14

struct xParEmitterPropsAsset : xBaseAsset
{
	u32 parSysID;              // 0x08
	union
	{
		xParInterp rate;
		xParInterp value[1];
	};                         // 0x0C
	xParInterp life;           // 0x20
	xParInterp size_birth;     // 0x34
	xParInterp size_death;     // 0x48
	xParInterp color_birth[4]; // 0x5C
	xParInterp color_death[4]; // 0xAC
	xParInterp vel_scale;      // 0xFC
	xParInterp vel_angle;      // 0x110
	xVec3 vel;                 // 0x124
	u32 emit_limit;            // 0x130
	f32 emit_limit_reset_time; // 0x134
}; // 0x138

//////////////////////
// PARS (xParSys.h) //
//////////////////////

// PARS asset format:
// - xParSysAsset
// - unknown
// - xLinkAsset[xParSysAsset.linkCount]

struct xParSysAsset : xBaseAsset
{
	u32 type;              // 0x00
	u32 parentParSysID;    // 0x04
	u32 textureID;         // 0x08
	u8 parFlags;           // 0x0C
	u8 priority;           // 0x0D
	u16 maxPar;            // 0x0E
	u8 renderFunc;         // 0x10
	u8 renderSrcBlendMode; // 0x11
	u8 renderDstBlendMode; // 0x12
	u8 cmdCount;           // 0x13
	u32 cmdSize;           // 0x14
}; // 0x18

struct xParCmdAsset
{
	u32 type;   // 0x00
	u8 enabled; // 0x04
	u8 mode;    // 0x05
	u8 pad[2];  // 0x06
}; // 0x08

struct xParCmdTex : xParCmdAsset
{
	f32 x1;          // 0x08
	f32 y1;          // 0x0C
	f32 x2;          // 0x10
	f32 y2;          // 0x14
	u8 birthMode;    // 0x18
	u8 rows;         // 0x19
	u8 cols;         // 0x1A
	u8 unit_count;   // 0x1B
	f32 unit_width;  // 0x1C
	f32 unit_height; // 0x20
}; // 0x24

///////////////////////////
// PICK (zPickupTable.h) //
///////////////////////////

// PICK asset format:
// - zAssetPickupTable
// - zAssetPickup[zAssetPickupTable.Count]

struct zAssetPickupTable
{
	u32 Magic; // 0x00
	u32 Count; // 0x04
}; // 0x08

struct zAssetPickup
{
	u32 pickupHash;  // 0x00
	u8 pickupType;   // 0x04
	u8 pickupIndex;  // 0x05
	u16 pickupFlags; // 0x06
	u32 quantity;    // 0x08
	u32 modelID;     // 0x0C
	u32 animID;      // 0x10
}; // 0x14

/////////////////////
// PIPT (xModel.h) //
/////////////////////

// PIPT asset format:
// - u32 count
// - xModelPipeInfo[count]

struct xModelPipeInfo
{
	u32 ModelHashID;   // 0x00
	u32 SubObjectBits; // 0x04
	u32 PipeFlags;     // 0x08
}; // 0x0C

/////////////////////////
// PKUP (zEntPickup.h) //
/////////////////////////

// PKUP asset format:
// - xEntAsset
// - xEntPickupAsset
// - xLinkAsset[xEntAsset.linkCount]

struct xEntPickupAsset
{
	u32 pickupHash;  // 0x00
	u16 pickupFlags; // 0x04
	u16 pickupValue; // 0x06
}; // 0x08

////////////////////////
// PLAT (xPlatform.h) //
////////////////////////

// PLAT asset format:
// - xEntAsset
// - xPlatformAsset
// - xEntMotionAsset
// - xLinkAsset[xEntAsset.linkCount]

struct xPlatformERData
{
	s32 nodata; // 0x00
}; // 0x04

struct xPlatformOrbitData
{
	s32 nodata; // 0x00
}; // 0x04

struct xPlatformSplineData
{
	s32 nodata; // 0x00
}; // 0x04

struct xPlatformMPData
{
	s32 nodata; // 0x00
}; // 0x04

struct xPlatformMechData
{
	s32 nodata; // 0x00
}; // 0x04

struct xPlatformPenData
{
	s32 nodata; // 0x00
}; // 0x04

struct xPlatformConvBeltData
{
	f32 speed; // 0x00
}; // 0x04

struct xPlatformFallingData
{
	f32 speed;       // 0x00
	u32 bustModelID; // 0x04
}; // 0x08

struct xPlatformFRData
{
	f32 fspeed;         // 0x00
	f32 rspeed;         // 0x04
	f32 ret_delay;      // 0x08
	f32 post_ret_delay; // 0x0C
}; // 0x10

struct xPlatformBreakawayData
{
	f32 ba_delay;    // 0x00
	u32 bustModelID; // 0x04
	f32 reset_delay; // 0x08
	u32 breakflags;  // 0x0C
}; // 0x10

struct xPlatformSpringboardData
{
	f32 jmph[3];     // 0x00
	f32 jmpbounce;   // 0x0C
	u32 animID[3];   // 0x10
	xVec3 jmpdir;    // 0x1C
	u32 springflags; // 0x28
}; // 0x2C

struct xPlatformTeeterData
{
	f32 itilt;   // 0x00
	f32 maxtilt; // 0x04
	f32 invmass; // 0x08
}; // 0x0C

struct xPlatformPaddleData
{
	s32 startOrient; // 0x00
	s32 countOrient; // 0x04
	f32 orientLoop;  // 0x08
	f32 orient[6];   // 0x0C
	u32 paddleFlags; // 0x24
	f32 rotateSpeed; // 0x28
	f32 accelTime;   // 0x2C
	f32 decelTime;   // 0x30
	f32 hubRadius;   // 0x34
}; // 0x38

struct xPlatformFMData
{
	s32 nothingyet; // 0x00
}; // 0x04

struct xPlatformAsset
{
	u8 type;   // 0x00
	u8 pad;    // 0x01
	u16 flags; // 0x02
	union
	{
		xPlatformERData er;
		xPlatformOrbitData orb;
		xPlatformSplineData spl;
		xPlatformMPData mp;
		xPlatformMechData mech;
		xPlatformPenData pen;
		xPlatformConvBeltData cb;
		xPlatformFallingData fall;
		xPlatformFRData fr;
		xPlatformBreakawayData ba;
		xPlatformSpringboardData sb;
		xPlatformTeeterData teet;
		xPlatformPaddleData paddle;
		xPlatformFMData fm;
	}; // 0x04
}; // 0x3C

/////////////////////////
// PLYR (zEntPlayer.h) //
/////////////////////////

// PLYR asset format:
// - xEntAsset
// - xLinkAsset[xEntAsset.linkCount]
// - u32 lightKitID

//////////////////////
// PORT (xPortal.h) //
//////////////////////

// PORT asset format:
// - xPortalAsset
// - xLinkAsset[xPortalAsset.linkCount]

struct xPortalAsset : xBaseAsset
{
	u32 assetCameraID; // 0x08
	u32 assetMarkerID; // 0x0C
	f32 ang;           // 0x10
	u32 sceneID;       // 0x14
}; // 0x18

/////////
// RAW //
/////////

// RAW asset format: unknown

//////////
// RWTX //
//////////

// RWTX asset format: RwTexDictionary

//////////////////
// SFX (xSFX.h) //
//////////////////

// SFX asset format:
// - xSFXAsset
// - xLinkAsset[xSFXAsset.linkCount]

struct xSFXAsset : xBaseAsset
{
	u16 flagsSFX;     // 0x08
	u16 freq;         // 0x0A
	f32 freqm;        // 0x0C
	u32 soundAssetID; // 0x10
	u32 attachID;     // 0x14
	u8 loopCount;     // 0x18
	u8 priority;      // 0x19
	u8 volume;        // 0x1A
	u8 pad;           // 0x1B
	xVec3 pos;        // 0x1C
	f32 innerRadius;  // 0x28
	f32 outerRadius;  // 0x2C
}; // 0x30

////////////////////////////
// SHDW (xShadowSimple.h) //
////////////////////////////

// SHDW asset format:
// - zSimpleShadowTableHeader
// - repeat zSimpleShadowTableHeader:
//   - u32 unknown
//   - u32 unknown
//   - u32 unknown

struct zSimpleShadowTableHeader
{
	u32 num; // 0x00
}; // 0x04

////////////////////////
// SHRP (zShrapnel.h) //
////////////////////////

// SHRP asset format:
// - zShrapnelAsset
// - unknown

struct xModelInstance;
struct zFrag;

enum zFragType
{
	eFragInactive,
	eFragGroup,
	eFragShrapnel,
	eFragParticle,
	eFragProjectile,
	eFragLightning,
	eFragSound,
	eFragShockwave,
	eFragCount,
	eFragForceSize = 0x7fffffff
};

struct zFragAsset
{
	zFragType type;  // 0x00
	u32 id;          // 0x04
	u32 parentID[2]; // 0x08
	f32 lifetime;    // 0x10
	f32 delay;       // 0x14
}; // 0x18

enum zFragLocType
{
	eFragLocBone,
	eFragLocBoneUpdated,
	eFragLocBoneLocal,
	eFragLocBoneLocalUpdated,
	eFragLocTag,
	eFragLocTagUpdated,
	eFragLocCount,
	eFragLocForceSize = 0x7fffffff
};

struct zFragBone
{
	s32 index;    // 0x00
	xVec3 offset; // 0x04
}; // 0x10

struct xModelTag
{
	xVec3 v;    // 0x00
	u32 matidx; // 0x0C
	f32 wt[4];  // 0x10
}; // 0x20

union zFragLocInfo
{
	zFragBone bone;
	xModelTag tag;
}; // 0x20

struct zFragLocation
{
	zFragLocType type; // 0x00
	zFragLocInfo info; // 0x04
}; // 0x24

struct xParEmitterCustomSettings : xParEmitterPropsAsset
{
	u32 custom_flags;          // 0x138
	u32 attachToID;            // 0x13C
	xVec3 pos;                 // 0x140
	xVec3 vel;                 // 0x14C
	f32 vel_angle_variation;   // 0x158
	u8 rot[3];                 // 0x15C
	u8 padding;                // 0x15F
	f32 radius;                // 0x160
	f32 emit_interval_current; // 0x164
	void* emit_volume;         // 0x168
}; // 0x16C

struct zParEmitter;

struct zFragParticleAsset : zFragAsset
{
	zFragLocation source;           // 0x18
	zFragLocation vel;              // 0x3C
	xParEmitterCustomSettings emit; // 0x60
	u32 parEmitterID;               // 0x1CC
	zParEmitter* parEmitter;        // 0x1D0
}; // 0x1D4

struct xCurveAsset;

struct zFragProjectileAsset : zFragAsset
{
	u32 modelInfoID;         // 0x18
	RpAtomic* modelFile;     // 0x1C
	zFragLocation launch;    // 0x20
	zFragLocation vel;       // 0x44
	f32 bounce;              // 0x68
	s32 maxBounces;          // 0x6C
	u32 flags;               // 0x70
	u32 childID;             // 0x74
	zShrapnelAsset* child;   // 0x78
	f32 minScale;            // 0x7C
	f32 maxScale;            // 0x80
	u32 scaleCurveID;        // 0x84
	xCurveAsset* scaleCurve; // 0x88
	f32 gravity;             // 0x8C
}; // 0x90

struct zFragLightningAsset : zFragAsset
{
	zFragLocation start; // 0x18
	zFragLocation end;   // 0x3C
	u32 startParentID;   // 0x60
	u32 endParentID;     // 0x64
}; // 0x68

struct zFragSoundAsset : zFragAsset
{
	u32 assetID;          // 0x18
	zFragLocation source; // 0x1C
	f32 volume;           // 0x40
	f32 innerRadius;      // 0x44
	f32 outerRadius;      // 0x48
}; // 0x4C

struct zFragShockwaveAsset : zFragAsset
{
	u32 modelInfoID;   // 0x18
	f32 birthRadius;   // 0x1C
	f32 deathRadius;   // 0x20
	f32 birthVelocity; // 0x24
	f32 deathVelocity; // 0x28
	f32 birthSpin;     // 0x2C
	f32 deathSpin;     // 0x30
	f32 birthColor[4]; // 0x34
	f32 deathColor[4]; // 0x44
}; // 0x54

struct zShrapnelAsset
{
	s32 fassetCount; // 0x00
	u32 shrapnelID;  // 0x04
	void(*initCB)(zShrapnelAsset*, xModelInstance*, xVec3*, void(*)(zFrag*, zFragAsset*)); // 0x08
}; // 0x0C

////////////////////////////
// SIMP (zEntSimpleObj.h) //
////////////////////////////

// SIMP asset format:
// - xEntAsset
// - xSimpleObjAsset
// - xLinkAsset[xEntAsset.linkCount]

struct xSimpleObjAsset
{
	f32 animSpeed;     // 0x00
	u32 initAnimState; // 0x04
	u8 collType;       // 0x08
	u8 flags;          // 0x09
}; // 0x0C

/////////
// SND //
/////////

// SND asset format: unknown

//////////
// SNDI //
//////////

// SNDI asset format: unknown

//////////
// SNDS //
//////////

// SNDS asset format: unknown

///////////////////////
// SURF (zSurface.h) //
///////////////////////

// SURF asset format:
// - zSurfAssetBase
// - xLinkAsset[zSurfAssetBase.linkCount]

struct zSurfMatFX
{
	u32 flags;     // 0x00
	u32 bumpmapID; // 0x04
	u32 envmapID;  // 0x08
	f32 shininess; // 0x0C
	f32 bumpiness; // 0x10
	u32 dualmapID; // 0x14
}; // 0x18

struct zSurfColorFX
{
	u16 flags; // 0x00
	u16 mode;  // 0x02
	f32 speed; // 0x04
}; // 0x08

struct zSurfTextureAnim
{
	u16 pad;   // 0x00
	u16 mode;  // 0x02
	u32 group; // 0x04
	f32 speed; // 0x08
}; // 0x0C

struct zSurfUVFX
{
	s32 mode;         // 0x00
	f32 rot;          // 0x04
	f32 rot_spd;      // 0x08
	xVec3 trans;      // 0x0C
	xVec3 trans_spd;  // 0x18
	xVec3 scale;      // 0x24
	xVec3 scale_spd;  // 0x30
	xVec3 min;        // 0x3C
	xVec3 max;        // 0x48
	xVec3 minmax_spd; // 0x54
}; // 0x60

struct zSurfAssetBase : xBaseAsset
{
	u8 game_damage_type;              // 0x08
	u8 game_sticky;                   // 0x09
	u8 game_damage_flags;             // 0x0A
	u8 surf_type;                     // 0x0B
	u8 phys_pad;                      // 0x0C
	u8 sld_start;                     // 0x0D
	u8 sld_stop;                      // 0x0E
	u8 phys_flags;                    // 0x0F
	f32 friction;                     // 0x10
	zSurfMatFX matfx;                 // 0x14
	zSurfColorFX colorfx;             // 0x2C
	u32 texture_anim_flags;           // 0x34
	zSurfTextureAnim texture_anim[2]; // 0x38
	u32 uvfx_flags;                   // 0x50
	zSurfUVFX uvfx[2];                // 0x54
	u8 on;                            // 0x114
	u8 surf_pad[3];                   // 0x115
	f32 oob_delay;                    // 0x118
	f32 walljump_scale_xz;            // 0x11C
	f32 walljump_scale_y;             // 0x120
	f32 damage_timer;                 // 0x124
	f32 damage_bounce;                // 0x128
}; // 0x12C

////////////////////
// TEXT (xText.h) //
////////////////////

// TEXT asset format:
// - xTextAsset
// - char[xTextAsset.len]
// - pad to 4 byte alignment

struct xTextAsset
{
	u32 len; // 0x00
}; // 0x04

/////////////////////
// TIMR (xTimer.h) //
/////////////////////

// TIMR asset format:
// - xTimerAsset
// - xLinkAsset[xTimerAsset.linkCount]

struct xTimerAsset : xBaseAsset
{
	f32 seconds;     // 0x00
	f32 randomRange; // 0x04
}; // 0x08

//////////////////////////
// TRIG (zEntTrigger.h) //
//////////////////////////

// TRIG asset format:
// - xEntAsset
// - xTriggerAsset
// - xLinkAsset[xEntAsset.linkCount]

struct xTriggerAsset
{
	xVec3 p[4];      // 0x00
	xVec3 direction; // 0x30
	u32 flags;       // 0x3C
}; // 0x40

////////////////
// UI (zUI.h) //
////////////////

// UI asset format:
// - zUIAsset
// - xLinkAsset[zUIAsset.linkCount]

struct zUIAsset : xEntAsset
{
	u32 uiFlags;   // 0x54
	u16 dim[2];    // 0x58
	u32 textureID; // 0x5C
	f32 uva[2];    // 0x60
	f32 uvb[2];    // 0x68
	f32 uvc[2];    // 0x70
	f32 uvd[2];    // 0x78
}; // 0x80

//////////////////////
// UIFT (zUIFont.h) //
//////////////////////

// UIFT asset format:
// - zUIFontAsset
// - xLinkAsset[zUIFontAsset.linkCount]

struct zUIFontAsset : zUIAsset
{
	u16 uiFontFlags; // 0x80
	u8 mode;         // 0x82
	u8 fontID;       // 0x83
	u32 textAssetID; // 0x84
	u8 bcolor[4];    // 0x88
	u8 color[4];     // 0x8C
	u16 inset[4];    // 0x90
	u16 space[2];    // 0x98
	u16 cdim[2];     // 0x9C
	u32 max_height;  // 0xA0
}; // 0xA4

////////////////////////////
// VIL (zNPCTypeCommon.h) //
////////////////////////////

// VIL asset format:
// - xEntAsset
// - xEntNPCAsset
// - xLinkAsset[xEntAsset.linkCount]

struct xEntNPCAsset
{
	s32 npcFlags;         // 0x00
	s32 npcModel;         // 0x04
	s32 npcProps;         // 0x08
	u32 movepoint;        // 0x0C
	u32 taskWidgetPrime;  // 0x10
	u32 taskWidgetSecond; // 0x14
}; // 0x18

//////////
// VILP //
//////////

// VILP asset format: unknown