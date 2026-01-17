// Simplified Graph for Demo
// We will treat the mall floor as a graph of nodes.
// Slot Nodes, Path Nodes, Entry Nodes.
// For A*, we need a graph dictionary: { node_id: { neighbor_id: cost, ... } }
// And coordinates for Heuristic.

// Coordinate system: 0-100% relative to image width/height (to be responsive)
// Slot coordinates (approximate based on typical layout)

export const NODES = {
    // Entries
    'ENTRY_1': { x: 50, y: 95, connections: ['PATH_MAIN'] },
    'ENTRY_2': { x: 50, y: 5, connections: ['PATH_TOP'] },

    // Main Paths
    'PATH_MAIN': { x: 50, y: 80, connections: ['ENTRY_1', 'PATH_CENTER', 'ROW_1_LEFT', 'ROW_1_RIGHT'] },
    'PATH_TOP': { x: 50, y: 20, connections: ['ENTRY_2', 'PATH_CENTER', 'ROW_2_LEFT', 'ROW_2_RIGHT'] },
    'PATH_CENTER': { x: 50, y: 50, connections: ['PATH_MAIN', 'PATH_TOP'] },

    // Branch Paths to Slots
    'ROW_1_LEFT': { x: 20, y: 80, connections: ['PATH_MAIN', 'M1-L1-S1', 'M1-L1-S2'] },
    'ROW_1_RIGHT': { x: 80, y: 80, connections: ['PATH_MAIN', 'M1-L1-S3', 'M1-L1-S4'] },
    'ROW_2_LEFT': { x: 20, y: 20, connections: ['PATH_TOP', 'M1-L2-S5', 'M1-L2-S6'] },
    'ROW_2_RIGHT': { x: 80, y: 20, connections: ['PATH_TOP', 'M1-L2-S7', 'M1-L2-S8'] },

    // Slot Nodes (Destination) - Mapped to Slot IDs
    'M1-L1-S1': { x: 10, y: 80, connections: ['ROW_1_LEFT'] },
    'M1-L1-S2': { x: 30, y: 80, connections: ['ROW_1_LEFT'] },
    'M1-L1-S3': { x: 70, y: 80, connections: ['ROW_1_RIGHT'] },
    'M1-L1-S4': { x: 90, y: 80, connections: ['ROW_1_RIGHT'] },

    'M1-L2-S5': { x: 10, y: 20, connections: ['ROW_2_LEFT'] },
    'M1-L2-S6': { x: 30, y: 20, connections: ['ROW_2_LEFT'] },
    'M1-L2-S7': { x: 70, y: 20, connections: ['ROW_2_RIGHT'] },
    'M1-L2-S8': { x: 90, y: 20, connections: ['ROW_2_RIGHT'] },

    // Mall 2 Mappings (Reusing same layout for demo simplicity, just re-mapping IDs if needed or assume same physical layout)
    'M2-L1-S1': { x: 10, y: 80, connections: ['ROW_1_LEFT'] },
    'M2-L1-S2': { x: 30, y: 80, connections: ['ROW_1_LEFT'] },
    'M2-L1-S3': { x: 70, y: 80, connections: ['ROW_1_RIGHT'] },
    'M2-L1-S4': { x: 90, y: 80, connections: ['ROW_1_RIGHT'] },
};

function heuristic(a, b) {
    // Manhattan distance or Euclidean
    const nodeA = NODES[a];
    const nodeB = NODES[b];
    return Math.sqrt(Math.pow(nodeA.x - nodeB.x, 2) + Math.pow(nodeA.y - nodeB.y, 2));
}

export function findPath(startNodeId, endNodeId) {
    // A* Implementation

    // If nodes don't exist in our weak graph definition, try to map or fail
    if (!NODES[startNodeId]) startNodeId = 'ENTRY_1'; // Default
    if (!NODES[endNodeId]) return null;

    let openSet = [startNodeId];
    let cameFrom = {};
    let gScore = {}; // Cost from start
    let fScore = {}; // Estimated cost to end

    Object.keys(NODES).forEach(n => {
        gScore[n] = Infinity;
        fScore[n] = Infinity;
    });

    gScore[startNodeId] = 0;
    fScore[startNodeId] = heuristic(startNodeId, endNodeId);

    while (openSet.length > 0) {
        // Get node with lowest fScore
        let current = openSet.reduce((a, b) => fScore[a] < fScore[b] ? a : b);

        if (current === endNodeId) {
            return reconstructPath(cameFrom, current);
        }

        openSet = openSet.filter(n => n !== current);

        // Neighbors
        let neighbors = NODES[current].connections || [];
        for (let neighbor of neighbors) {
            // Distance between current and neighbor (can assume 1 or actual distance)
            let d = heuristic(current, neighbor);
            let tentative_gScore = gScore[current] + d;

            if (tentative_gScore < gScore[neighbor]) {
                cameFrom[neighbor] = current;
                gScore[neighbor] = tentative_gScore;
                fScore[neighbor] = gScore[neighbor] + heuristic(neighbor, endNodeId);

                if (!openSet.includes(neighbor)) {
                    openSet.push(neighbor);
                }
            }
        }
    }
    return null; // No path
}

function reconstructPath(cameFrom, current) {
    let totalPath = [current];
    while (current in cameFrom) {
        current = cameFrom[current];
        totalPath.unshift(current);
    }
    // Return array of coordinates
    return totalPath.map(nodeId => NODES[nodeId]);
}
