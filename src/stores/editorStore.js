import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

let _idCounter = 0;
export const genId = () => `el_${++_idCounter}_${Date.now().toString(36)}`;
export const genGroupId = () => `grp_${++_idCounter}_${Date.now().toString(36)}`;

const useEditorStore = create(subscribeWithSelector((set, get) => ({
  // ----- Elements on canvas -----
  elements: [],
  // { id, textureKey, fileName, filePath, objectUrl, x, y, w, h, originW, originH,
  //   rotation, scaleX, scaleY,
  //   nineSlice: null | { left, right, top, bottom },
  //   animation: null | { type, trigger, config },
  //   interactive: false, interactionTrigger: 'hover',
  //   groupId: null, visible: true, name: '' }

  addElement: (el) =>
    set((s) => ({ elements: [...s.elements, { id: genId(), visible: true, ...el }] })),

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
