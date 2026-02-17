import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

let _idCounter = 0;
export const genId = () => `el_${++_idCounter}_${Date.now().toString(36)}`;
export const genGroupId = () => `grp_${++_idCounter}_${Date.now().toString(36)}`;

const useEditorStore = create(subscribeWithSelector((set, get) => ({
  // ----- Elements on canvas -----
  elements: [],
  // Image element: { id, type: 'image', textureKey, fileName, filePath, objectUrl,
  //   x, y, w, h, originW, originH, rotation, scaleX, scaleY,
  //   nineSlice: null | { left, right, top, bottom },
  //   animation: null | { type, trigger, config },
  //   interactive: false, interactionTrigger: 'hover',
  //   groupId: null, visible: true, name: '' }
  //
  // Text element: { id, type: 'text', x, y, w, h, rotation,
  //   text, fontFamily, fontSize, fontStyle, color, align,
  //   wordWrapWidth, stroke, strokeThickness,
  //   lineSpacing, letterSpacing, padding,
  //   animation, interactive, interactionTrigger,
  //   groupId, visible, name }

  addElement: (el) =>
    set((s) => ({ elements: [...s.elements, { id: genId(), type: 'image', visible: true, ...el }] })),

  addTextElement: (x, y) =>
    set((s) => ({
      elements: [...s.elements, {
        id: genId(),
        type: 'text',
        x: Math.round(x),
        y: Math.round(y),
        w: 0,
        h: 0,
        rotation: 0,
        text: 'Text',
        fontFamily: 'Arial',
        fontSize: 24,
        fontStyle: '',
        color: '#ffffff',
        align: 'left',
        wordWrapWidth: 0,
        stroke: '#000000',
        strokeThickness: 0,
        lineSpacing: 0,
        letterSpacing: 0,
        padding: 0,
        nineSlice: null,
        animation: null,
        interactive: false,
        interactionTrigger: 'hover',
        groupId: null,
        visible: true,
        name: 'Text',
      }],
    })),

  updateElement: (id, patch) =>
    set((s) => ({
      elements: s.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),

  removeElement: (id) =>
    set((s) => ({
      elements: s.elements.filter((e) => e.id !== id),
      selectedIds: s.selectedIds.filter((sid) => sid !== id),
    })),

  reorderElement: (id, newIndex) =>
    set((s) => {
      const arr = [...s.elements];
      const oldIndex = arr.findIndex((e) => e.id === id);
      if (oldIndex === -1) return {};
      const [item] = arr.splice(oldIndex, 1);
      arr.splice(newIndex, 0, item);
      return { elements: arr };
    }),

  // ----- Selection -----
  selectedIds: [],
  setSelection: (ids) => set({ selectedIds: ids }),
  toggleSelection: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((sid) => sid !== id)
        : [...s.selectedIds, id],
    })),
  clearSelection: () => set({ selectedIds: [] }),

  // ----- Groups -----
  groups: [],
  addGroup: (name, childIds) => {
    const gid = genGroupId();
    set((s) => ({
      groups: [...s.groups, { id: gid, name, children: childIds }],
      elements: s.elements.map((e) =>
        childIds.includes(e.id) ? { ...e, groupId: gid } : e
      ),
    }));
    return gid;
  },

  removeGroup: (gid) =>
    set((s) => ({
      groups: s.groups.filter((g) => g.id !== gid),
      elements: s.elements.map((e) =>
        e.groupId === gid ? { ...e, groupId: null } : e
      ),
    })),

  // ----- Snap -----
  snapEnabled: true,
  snapThreshold: 5,
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),

  // ----- Zoom -----
  zoom: 1,
  setZoom: (z) => set({ zoom: Math.max(0.1, Math.min(5, z)) }),

  // ----- Asset files -----
  assetFiles: [],
  directoryHandle: null,
  setDirectoryHandle: (h) => set({ directoryHandle: h }),
  setAssetFiles: (files) => set({ assetFiles: files }),

  // ----- Export modal -----
  exportOpen: false,
  setExportOpen: (v) => set({ exportOpen: v }),

  // ----- Clipboard (copy / paste) -----
  clipboard: [],

  copySelection: () => {
    const { selectedIds, elements } = get();
    if (selectedIds.length === 0) return;
    const copied = elements
      .filter((e) => selectedIds.includes(e.id))
      .map((e) => ({ ...e }));
    set({ clipboard: copied });
  },

  pasteClipboard: () => {
    const { clipboard, elements } = get();
    if (clipboard.length === 0) return;

    const OFFSET = 20;
    const oldToNewId = {};
    const oldToNewGroup = {};
    const newElements = [];

    for (const src of clipboard) {
      const newId = genId();
      oldToNewId[src.id] = newId;

      let newGroupId = null;
      if (src.groupId) {
        if (!oldToNewGroup[src.groupId]) {
          oldToNewGroup[src.groupId] = genGroupId();
        }
        newGroupId = oldToNewGroup[src.groupId];
      }

      newElements.push({
        ...src,
        id: newId,
        x: src.x + OFFSET,
        y: src.y + OFFSET,
        groupId: newGroupId,
        name: src.name ? `${src.name} copy` : src.name,
      });
    }

    // Rebuild groups for pasted elements
    const { groups } = get();
    const newGroups = [];
    for (const [oldGid, newGid] of Object.entries(oldToNewGroup)) {
      const orig = groups.find((g) => g.id === oldGid);
      if (orig) {
        const newChildren = orig.children
          .filter((cid) => oldToNewId[cid])
          .map((cid) => oldToNewId[cid]);
        newGroups.push({ id: newGid, name: `${orig.name} copy`, children: newChildren });
      }
    }

    const newIds = newElements.map((e) => e.id);
    set((s) => ({
      elements: [...s.elements, ...newElements],
      groups: [...s.groups, ...newGroups],
      selectedIds: newIds,
    }));
  },

  deleteSelection: () => {
    const { selectedIds, elements, groups } = get();
    if (selectedIds.length === 0) return;
    const remaining = elements.filter((e) => !selectedIds.includes(e.id));
    const remainingIds = new Set(remaining.map((e) => e.id));
    const updatedGroups = groups
      .map((g) => ({ ...g, children: g.children.filter((cid) => remainingIds.has(cid)) }))
      .filter((g) => g.children.length > 0);
    const liveGroupIds = new Set(updatedGroups.map((g) => g.id));
    set({
      elements: remaining.map((e) =>
        e.groupId && !liveGroupIds.has(e.groupId) ? { ...e, groupId: null } : e
      ),
      groups: updatedGroups,
      selectedIds: [],
    });
  },

  // ----- Helpers -----
  getSelectedElements: () => {
    const s = get();
    return s.elements.filter((e) => s.selectedIds.includes(e.id));
  },

  getGroupMembers: (gid) => {
    return get().elements.filter((e) => e.groupId === gid);
  },
})));

export default useEditorStore;
