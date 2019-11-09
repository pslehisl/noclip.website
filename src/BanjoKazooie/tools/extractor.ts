
import ArrayBufferSlice from "../../ArrayBufferSlice";
import { readFileSync, writeFileSync } from "fs";
import { assert, hexzero, nArray } from "../../util";
import * as Pako from 'pako';
import * as BYML from "../../byml";

function fetchDataSync(path: string): ArrayBufferSlice {
    const b: Buffer = readFileSync(path);
    return new ArrayBufferSlice(b.buffer as ArrayBuffer);
}

const pathBaseIn  = `../../../data/BanjoKazooie_Raw`;
const pathBaseOut = `../../../data/BanjoKazooie`;

interface FSFile {
    fileTableOffs: number;
    dataOffs: number;
    flags: number;
}

interface FS {
    buffer: ArrayBufferSlice;
    files: FSFile[];
}

function getFileSize(fs: FS, file: FSFile): number {
    const fileIndex = fs.files.indexOf(file);
    for (let i = fileIndex; i < fs.files.length; i++)
        if (fs.files[i].dataOffs > file.dataOffs)
            return fs.files[i].dataOffs - file.dataOffs;
    return -1;
}

function getFileBuffer(fs: FS, file: FSFile): ArrayBufferSlice {
    const fileSize = getFileSize(fs, file);
    if (fileSize >= 0)
        return fs.buffer.subarray(file.dataOffs, fileSize);
    else
        return fs.buffer.subarray(file.dataOffs);
}

function decompress(buffer: ArrayBufferSlice): ArrayBufferSlice {
    const view = buffer.createDataView();

    assert(view.getUint16(0x00) === 0x1172);
    const decompressedFileSize = view.getUint32(0x02);

    let srcOffs = 0x06;
    const decompressed = Pako.inflateRaw(buffer.createTypedArray(Uint8Array, srcOffs, decompressedFileSize), { raw: true });
    return new ArrayBufferSlice(decompressed.buffer as ArrayBuffer);
}

interface CRG1File {
    Data: ArrayBufferSlice;
}

function extractFileAndAppend(fileTable: CRG1File[], fs: FS, fsfile: FSFile): number {
    if (fsfile === null)
        return -1;

    const index = fileTable.length;
    fileTable.push(extractFile(fs, fsfile));
    return index;
}

function extractFile(fs: FS, fsfile: FSFile): CRG1File {
    const fileBuffer = getFileBuffer(fs, fsfile);
    const buffer = (fsfile.flags & 0x00010000) ? decompress(fileBuffer) : fileBuffer;
    return { Data: buffer };
}

function decompressBigSlice(fs: FS, offset: number, end: number): ArrayBufferSlice {
    const romView = fs.buffer.createDataView();
    const giantBuffer = new ArrayBuffer(romView.getUint32(offset + 2) + (end - offset));
    new Uint8Array(giantBuffer).set(fs.buffer.createTypedArray(Uint8Array, offset, end - offset));
    return decompress(new ArrayBufferSlice(giantBuffer));
}

function extractMap(fs: FS, name: string, sceneID: number): void {
    const fileTable: CRG1File[] = [];

    const crg1 = {
        Name: name,
        SceneID: sceneID,
        SetupFileId: -1,
        Files: fileTable,

        // Geometry
        OpaGeoFileId: -1,
        XluGeoFileId: -1,

        // Skybox
        OpaSkyboxFileId: -1,
        OpaSkyboxScale: 1,
        XluSkyboxFileId: -1,
        XluSkyboxScale: 1,
    };

    crg1.SetupFileId = extractFileAndAppend(fileTable, fs, fs.files[sceneID + 0x71c]);

    const f9cae0 = decompress(fs.buffer.slice(0xF9CAE0));
    const f9cae0View = f9cae0.createDataView();

    for (let i = 0x7650; i < 0x8250; i += 0x18) {
        const sceneTableID  = f9cae0View.getUint16(i + 0x00);
        if (sceneTableID === sceneID) {
            const opaId = f9cae0View.getUint16(i + 0x02);
            const xluId = f9cae0View.getUint16(i + 0x04);

            crg1.OpaGeoFileId = extractFileAndAppend(fileTable, fs, opaId > 0 ? fs.files[opaId] : null);
            crg1.XluGeoFileId = extractFileAndAppend(fileTable, fs, xluId > 0 ? fs.files[xluId] : null);
            break;
        }
    }

    for (let i = 0x87B0; i < 0x8BA0; i += 0x28) {
        const skyboxTableSceneID  = f9cae0View.getUint16(i + 0x00);
        if (skyboxTableSceneID === sceneID) {
            const opaSkyboxId    = f9cae0View.getUint16(i + 0x04);
            const opaSkyboxScale = f9cae0View.getFloat32(i + 0x08);
            const xluSkyboxId    = f9cae0View.getUint16(i + 0x10);
            const xluSkyboxScale = f9cae0View.getFloat32(i + 0x14);

            crg1.OpaSkyboxFileId = extractFileAndAppend(fileTable, fs, opaSkyboxId > 0 ? fs.files[opaSkyboxId] : null);
            crg1.OpaSkyboxScale = opaSkyboxScale;
            crg1.XluSkyboxFileId = extractFileAndAppend(fileTable, fs, xluSkyboxId > 0 ? fs.files[xluSkyboxId] : null);
            crg1.XluSkyboxScale = xluSkyboxScale;
            break;
        }
    }

    const data = BYML.write(crg1, BYML.FileType.CRG1);
    writeFileSync(`${pathBaseOut}/${hexzero(sceneID, 2).toUpperCase()}_arc.crg1`, Buffer.from(data));
}

const enum MIPSOpcode {
    regBlock = 0x0,
    JAL = 0x3,
    ADDIU = 0x9,
    ORI = 0xd,
    LUI = 0xf,
}

interface AnimationEntry {
    id: number;
    duration: number;
}

interface ObjectLoadEntry {
    otherID: number; // not sure what this is
    spawnID: number;
    modelFile?: CRG1File;
    animationTable: AnimationEntry[];
    animationStartIndex: number;
    scale: number;
}

function parseObjectLoadEntry(fs: FS, map: RAMMapper, startAddress: number): ObjectLoadEntry {
    const view = map.lookup(startAddress);
    let offs = 0;

    const otherID = view.getUint16(offs + 0x0);
    const spawnID = view.getUint16(offs + 0x2);
    const fileIndex = view.getUint16(offs + 0x4);
    const animationStartIndex = view.getUint16(offs + 0x6);
    const animationTableAddress = view.getUint32(offs + 0x8);
    const scale = view.getFloat32(offs + 0x1c);

    let modelFile: CRG1File | undefined;
    if (fileIndex !== 0)
        modelFile = extractFile(fs, fs.files[fileIndex]);

    const animationTable: AnimationEntry[] = [];
    if (animationTableAddress !== 0) {
        const animView = map.lookup(animationTableAddress);
        offs = 0;

        while (true) {
            const id = animView.getUint32(offs + 0x0);
            const duration = animView.getFloat32(offs + 0x4);
            if (id === 0 && animationTable.length > 0)
                break; // the first entry can be (and often is) zero
            animationTable.push({ id, duration });
            offs += 8;
        }
    }
    return { otherID, spawnID, modelFile, animationTable, animationStartIndex, scale };
}

interface RAMRegion {
    data: ArrayBufferSlice;
    start: number;
}

class RAMMapper {
    public regions: RAMRegion[] = [];

    public lookup(address: number): DataView {
        for (let i = 0; i < this.regions.length; i++) {
            const delta = address - this.regions[i].start
            if (delta >= 0 && delta < this.regions[i].data.byteLength) {
                return this.regions[i].data.createDataView(delta);
            }
        }
        throw `couldn't find region for ${address}`;
    }
}

function extractObjectLoad(fs: FS) {
    const setupTable: ObjectLoadEntry[] = [];

    const map = new RAMMapper();
    // the second file table at 3ffe10 in RAM has a list of addresses of compressed files
    // some (all?) of these contain code, and are followed by another compressed file with data
    // the uncompressed files are placed consecutively in RAM, so probably a better way to get these addresses
    map.regions.push({ data: decompressBigSlice(fs, 0xF37F90, 0xF9CAE0), start: 0x80286F90 });
    map.regions.push({ data: decompressBigSlice(fs, 0xF9CAE0, 0xFA3FD0), start: 0x80363590 });
    map.regions.push({ data: decompressBigSlice(fs, 0xFC6F20, 0XFC8AFC), start: 0x803863F0 });
    map.regions.push({ data: decompressBigSlice(fs, 0xFC8AFC, 0XFC9150), start: 0x8038D350 });

    extractObjectLoadFromAssembly(fs, setupTable, map, 0x802c2c08);
    extractObjectLoadFromAssembly(fs, setupTable, map, 0x8038c4f4);

    const data = BYML.write({ ObjectSetupTable: setupTable }, BYML.FileType.CRG1);
    writeFileSync(`${pathBaseOut}/objectSetup_arc.crg1`, Buffer.from(data));
}

function extractObjectLoadFromAssembly(fs: FS, setupTable: ObjectLoadEntry[], map: RAMMapper, entryAddress: number) {
    const view = map.lookup(entryAddress);

    let offs = 0;
    // RAM address of function that appends an entry to the object load table
    // divide by four to match MIPS function call
    const appendEntry = 0x3053e8 / 4;
    // address of a function that appends an entry if a particular bit is set
    const conditionalAppendEntry = 0x3054a4 / 4;

    // registers to keep track of
    // only a0-a3 (4-7) change, though r0 is read
    const regs = nArray(8, () => 0);
    let delay = false;
    while (true) {
        const instr = view.getUint32(offs);
        const rs = (instr >>> 21) & 0x1f;
        const rt = (instr >>> 16) & 0x1f;
        const rd = (instr >>> 11) & 0x1f;
        const imm = instr & 0xffff;
        offs += 4;
        switch (instr >>> 26) {
            case MIPSOpcode.regBlock:
                assert((instr & 0x3f) === 0x25, "non-OR register instruction found");
                assert(rt === 0); // really just a MOV
                if (rs === 16) // from reg s0
                    regs[rd] = 0x803272f8;
                else
                    regs[rd] = regs[rs];
                break;
            case MIPSOpcode.JAL:
                const funcAddr = instr & 0x00ffffff;
                assert(funcAddr == appendEntry || funcAddr == conditionalAppendEntry, "unknown function found");
                delay = true;
                break;
            case MIPSOpcode.ADDIU:
                assert(rs < 8 && rt < 8);
                regs[rt] = regs[rs] + imm - ((imm >= 0x8000) ? 0x10000 : 0); // sign extend
                break;
            case MIPSOpcode.ORI:
                assert(rs < 8 && rt < 8);
                regs[rt] = regs[rs] | imm;
                break;
            case MIPSOpcode.LUI:
                assert(rt < 8);
                regs[rt] = (imm << 16) >>> 0;
                break;
            default:
                // done with the setup portion
                return;
        }
        if (delay && (instr >>> 26) !== MIPSOpcode.JAL) {
            delay = false;
            // interpret function arguments
            // TODO: figure out how much a1 (the init function) and a2 (the flags) matter for our purposes
            setupTable.push(parseObjectLoadEntry(fs, map, regs[4]));
        }
    }
}

function main() {
    const romData = fetchDataSync(`${pathBaseIn}/rom.z64`);
    const view = romData.createDataView();

    const files: FSFile[] = [];
    for (let fsTableIdx = 0x5E98; fsTableIdx < 0x10CD0; fsTableIdx += 0x08) {
        const ptr = view.getUint32(fsTableIdx + 0x00);
        const flags = view.getUint32(fsTableIdx + 0x04);
        const dataOffs = 0x10CD0 + ptr;
        files.push({ fileTableOffs: fsTableIdx, dataOffs, flags });
    }
    const fs = { buffer: romData, files };

    // Names taken from Banjo's Backpack.
    extractMap(fs, "SM - Spiral Mountain",                0x01);
    extractMap(fs, "SM - Banjo's House",                  0x8C);
    extractMap(fs, "MM - Mumbo's Mountain",               0x02);
    extractMap(fs, "MM - Ticker's Tower",                 0x0C);
    extractMap(fs, "MM - Mumbo's Skull",                  0x0E);
    extractMap(fs, "TTC - Treasure Trove Cove",           0x07);
    extractMap(fs, "TTC - Blubber's Ship",                0x05);
    extractMap(fs, "TTC - Nipper's Shell",                0x06);
    extractMap(fs, "TTC - Sandcastle",                    0x0A);
    extractMap(fs, "TTC - Sharkfood Island",              0x8F);
    extractMap(fs, "CC - Clanker's Cavern",               0x0B);
    extractMap(fs, "CC - Inside Clanker",                 0x22);
    extractMap(fs, "CC - Inside Clanker - Witch Switch",  0x21);
    extractMap(fs, "CC - Inside Clanker - Gold Feathers", 0x23);
    extractMap(fs, "BGS - Bubblegloop Swamp",             0x0D);
    extractMap(fs, "BGS - Mr. Vile",                      0x10);
    extractMap(fs, "BGS - TipTup Chior",                  0x11);
    extractMap(fs, "BGS - Mumbo's Skull",                 0x47);
    extractMap(fs, "FP - Freezeezy Peak",                 0x27);
    extractMap(fs, "FP - Boggy's Igloo",                  0x41);
    extractMap(fs, "FP - Mumbo's Skull",                  0x48);
    extractMap(fs, "FP - Christmas Tree",                 0x53);
    extractMap(fs, "FP - Wozza's Cave",                   0x7F);
    extractMap(fs, "GV - Gobi's Valley",                  0x12);
    extractMap(fs, "GV - Puzzle Room",                    0x13);
    extractMap(fs, "GV - King Sandybutt's Tomb",          0x14);
    extractMap(fs, "GV - Water Room",                     0x15);
    extractMap(fs, "GV - Rupee",                          0x16);
    extractMap(fs, "GV - Jinxy",                          0x1A);
    extractMap(fs, "GV - Secret Blue Egg",                0x92);
    extractMap(fs, "MMM - Mad Monster Mansion",           0x1B);
    extractMap(fs, "MMM - Septic Tank",                   0x8D);
    extractMap(fs, "MMM - Church",                        0x1C);
    extractMap(fs, "MMM - Cellar",                        0x1D);
    extractMap(fs, "MMM - Tumblar's Shed",                0x24);
    extractMap(fs, "MMM - Well",                          0x25);
    extractMap(fs, "MMM - Dining Room",                   0x26);
    extractMap(fs, "MMM - Egg Room",                      0x28);
    extractMap(fs, "MMM - Note Room",                     0x29);
    extractMap(fs, "MMM - Feather Room",                  0x2A);
    extractMap(fs, "MMM - Secret Church Room",            0x2B);
    extractMap(fs, "MMM - Bathroom",                      0x2C);
    extractMap(fs, "MMM - Bedroom",                       0x2D);
    extractMap(fs, "MMM - Gold Feather Room",             0x2E);
    extractMap(fs, "MMM - Drainpipe",                     0x2F);
    extractMap(fs, "MMM - Mumbo's Hut",                   0x30);
    extractMap(fs, "RBB - Rusty Bucket Bay",              0x31);
    extractMap(fs, "RBB - Anchor Room",                   0x8B);
    extractMap(fs, "RBB - Machine Room",                  0x34);
    extractMap(fs, "RBB - Big Fish Warehouse",            0x35);
    extractMap(fs, "RBB - Boat Room",                     0x36);
    extractMap(fs, "RBB - First Blue Container",          0x37);
    extractMap(fs, "RBB - Third Blue Container",          0x38);
    extractMap(fs, "RBB - Sea-Grublin's Cabin",           0x39);
    extractMap(fs, "RBB - Kaboom's Room",                 0x3A);
    extractMap(fs, "RBB - Mini Kaboom's Room",            0x3B);
    extractMap(fs, "RBB - Kitchen",                       0x3C);
    extractMap(fs, "RBB - Navigation Room",               0x3D);
    extractMap(fs, "RBB - Second Blue Container",         0x3E);
    extractMap(fs, "RBB - Captain's Room",                0x3F);
    extractMap(fs, "CCW - Click Clock Wood",              0x40);
    extractMap(fs, "CCW - Spring",                        0x43);
    extractMap(fs, "CCW - Summer",                        0x44);
    extractMap(fs, "CCW - Fall",                          0x45);
    extractMap(fs, "CCW - Winter",                        0x46);
    extractMap(fs, "CCW - Mumbo - Spring",                0x4A);
    extractMap(fs, "CCW - Mumbo - Summer",                0x4B);
    extractMap(fs, "CCW - Mumbo - Fall",                  0x4C);
    extractMap(fs, "CCW - Mumbo - Winter",                0x4D);
    extractMap(fs, "CCW - Beehive - Summer",              0x5A);
    extractMap(fs, "CCW - Beehive - Spring",              0x5B);
    extractMap(fs, "CCW - Beehive - Fall",                0x5C);
    extractMap(fs, "CCW - Nabnuts House - Spring",        0x5E);
    extractMap(fs, "CCW - Nabnuts House - Summer",        0x5F);
    extractMap(fs, "CCW - Nabnuts House - Fall",          0x60);
    extractMap(fs, "CCW - Nabnuts House - Winter",        0x61);
    extractMap(fs, "CCW - Nabnut's Attic - Winter",       0x62);
    extractMap(fs, "CCW - Nabnut's Attic - Fall",         0x63);
    extractMap(fs, "CCW - Nabnut's Attic 2 - Winter",     0x64);
    extractMap(fs, "CCW - Whipcrack Room - Spring",       0x65);
    extractMap(fs, "CCW - Whipcrack Room - Summer",       0x66);
    extractMap(fs, "CCW - Whipcrack Room - Fall",         0x67);
    extractMap(fs, "CCW - Whipcrack Room - Winter",       0x68);
    extractMap(fs, "GL - Floor 1",                        0x69);
    extractMap(fs, "GL - Floor 2",                        0x6A);
    extractMap(fs, "GL - Floor 3",                        0x6B);
    extractMap(fs, "GL - Floor 4",                        0x71);
    extractMap(fs, "GL - Floor 5",                        0x6E);
    extractMap(fs, "GL - Floor 6 FP Entrance",            0x6F);
    extractMap(fs, "GL - Floor 7",                        0x79);
    extractMap(fs, "GL - Floor 8",                        0x93);
    extractMap(fs, "GL - Pipe Room",                      0x6C);
    extractMap(fs, "GL - TTC Entrance",                   0x6D);
    extractMap(fs, "GL - CC Entrance",                    0x70);
    extractMap(fs, "GL - BGS Entrance",                   0x72);
    extractMap(fs, "GL - Lava Room",                      0x74);
    extractMap(fs, "GL - MMM Entrance",                   0x75);
    extractMap(fs, "GL - Floor 6 Water Switch Area",      0x76);
    extractMap(fs, "GL - RBB Entrance",                   0x77);
    extractMap(fs, "GL - MMM Puzzle",                     0x78);
    extractMap(fs, "GL - Coffin Room",                    0x7A);
    extractMap(fs, "GL - Path to Quiz show",              0x80);
    extractMap(fs, "GL - Furnace Fun",                    0x8E);
    extractMap(fs, "GL - Boss",                           0x90);

    extractObjectLoad(fs);
}

main();