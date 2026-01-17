// Graph for "Left to Right" layout
// We assume a container width of roughly 1000px, height 400px.
// Slots are roughly distributed along the X axis.
// Path is a line below them.

// To make this responsive and generic, we need to map Slot IDs to X/Y percentages or pixels.
// Since FloorPlan renders dynamically, let's hardcode the logical graph.

// Standard Layout:
// Entry @ Right (100% X, 50% Y)
// Main Path running East-West @ 80% Y? Or 50% Y if slots are top/bottom?
// User said: "Blue are the slots... left to right"
// Let's assume slots are top row (20% Y). Path is bottom row (80% Y)?
// Or Path is center.

const NODES_GRAPH = {
    'ENTRY': { x: 950, y: 200, adj: ['PATH_MAIN'] }, // Right side entry
    'PATH_MAIN': { x: 500, y: 200, adj: ['ENTRY', 'S1_NODE', 'S2_NODE', 'S3_NODE', 'S4_NODE'] },

    // Slot Approach Nodes (Points on the path below the slots)
    // Assuming 4 slots distributed: 20%, 40%, 60%, 80% width
    'S1_NODE': { x: 200, y: 200, adj: ['PATH_MAIN'] },
    'S2_NODE': { x: 400, y: 200, adj: ['PATH_MAIN'] },
    'S3_NODE': { x: 600, y: 200, adj: ['PATH_MAIN'] },
    'S4_NODE': { x: 800, y: 200, adj: ['PATH_MAIN'] },
};

// Map real Slot IDs to abstract graph nodes
const SLOT_MAP = {
    // Mall 1 Level 1
    'M1-L1-S1': { x: 200, y: 100, entry: 'S1_NODE' },
    'M1-L1-S2': { x: 400, y: 100, entry: 'S2_NODE' },
    'M1-L1-S3': { x: 600, y: 100, entry: 'S3_NODE' },
    'M1-L1-S4': { x: 800, y: 100, entry: 'S4_NODE' },

    // Mall 1 Level 2 (5-8)
    'M1-L2-S5': { x: 200, y: 100, entry: 'S1_NODE' },
    'M1-L2-S6': { x: 400, y: 100, entry: 'S2_NODE' },
    'M1-L2-S7': { x: 600, y: 100, entry: 'S3_NODE' },
    'M1-L2-S8': { x: 800, y: 100, entry: 'S4_NODE' },

    // Mall 2 Level 1 (1-4)
    'M2-L1-S1': { x: 200, y: 100, entry: 'S1_NODE' },
    'M2-L1-S2': { x: 400, y: 100, entry: 'S2_NODE' },
    'M2-L1-S3': { x: 600, y: 100, entry: 'S3_NODE' },
    'M2-L1-S4': { x: 800, y: 100, entry: 'S4_NODE' },
};

export const NODES = {}; // Placeholder if needed

export function findPath(startId, endSlotId) {
    // Simplified "Path" for display:
    // Entry -> Main Path -> Slot Node -> Slot

    const target = SLOT_MAP[endSlotId];
    if (!target) return [];

    // Construct simple line segment path
    // 1. Start at Entry
    const p1 = NODES_GRAPH['ENTRY'];

    // 2. Go to specific approach node
    const approachNode = NODES_GRAPH[target.entry];

    // 3. Go to Slot
    const p3 = { x: target.x, y: target.y };

    // Return array of points for SVG
    return [p1, approachNode, p3];
}
