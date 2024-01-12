import { GraphHelper, Graph } from "./GraphHelper";
import { PriorityQueue } from "./PriorityQueue";
import { Cell, CellStyles } from "./cell";

export interface DijkstraState {
  selectedCellStyleToPlace: CellStyles;
  distances: { [key: string]: number } | undefined;
  path: Cell[] | undefined;
  visited: Cell[] | undefined;
}

export const dijkstra = (
  graph: Graph
): {
  distances: { [key: string]: number };
  visited: Cell[];
} => {
  if (!graph.startCell || !graph.finishCell)
    throw new Error("No start cell or finish cell");

  const distances: { [key: string]: number } = {};
  const visited: { [key: string]: boolean } = {};
  const visitedCells: Cell[] = [];
  const priorityQueue = new PriorityQueue<Cell>();

  // initialize all cells with distance infinity and visited false
  for (let row = 0; row < graph.graph.length; row++) {
    for (let col = 0; col < graph.graph[row].length; col++) {
      const cell = GraphHelper.getCell(graph, row, col);

      distances[`${cell.posRow}-${cell.posCol}`] = Infinity;
      visited[`${cell.posRow}-${cell.posCol}`] = false;
    }
  }

  // set start cell properties according to dijkstra
  distances[`${graph.startCell.posRow}-${graph.startCell.posCol}`] = 0;
  priorityQueue.enqueue(graph.startCell, 0);

  while (!priorityQueue.isEmpty()) {
    const currentCell: Cell = priorityQueue.dequeue();

    if (visited[`${currentCell.posRow}-${currentCell.posCol}`]) continue;
    visited[`${currentCell.posRow}-${currentCell.posCol}`] = true;

    visitedCells.push(currentCell);

    for (const neighbor of GraphHelper.getNeighbors(graph, currentCell)) {
      const newDistance =
        distances[`${currentCell.posRow}-${currentCell.posCol}`] + 1;
      if (newDistance < distances[`${neighbor.posRow}-${neighbor.posCol}`]) {
        distances[`${neighbor.posRow}-${neighbor.posCol}`] = newDistance;
        priorityQueue.enqueue(neighbor, newDistance);
      }
    }
  }

  return { distances, visited: visitedCells };
};

export const dijkstraBackTrack = (
  graph: Graph,
  dijkstraState: DijkstraState
): Cell[] => {
  if (graph.startCell === undefined || graph.finishCell === undefined) {
    throw new Error("No start cell");
  }

  const path: Cell[] = [];
  let currentCell = graph.finishCell;

  while (
    !(
      currentCell.posRow === graph.startCell.posRow &&
      currentCell.posCol === graph.startCell.posCol
    )
  ) {
    path.unshift(currentCell);
    const neighbors = GraphHelper.getNeighbors(graph, currentCell);

    const nextCell = neighbors.reduce((minDistanceCell, neighbor) => {
      if (dijkstraState.distances === undefined) {
        throw new Error("dijkstra distances empty");
      }
      const key = `${neighbor.posRow}-${neighbor.posCol}`;
      const neighborDistance = dijkstraState.distances[key];

      const minDistanceKey = `${minDistanceCell.posRow}-${minDistanceCell.posCol}`;
      const minDistance = dijkstraState.distances[minDistanceKey];

      if (neighborDistance < minDistance) {
        return neighbor;
      } else {
        return minDistanceCell;
      }
    }, neighbors[0]);
    currentCell = nextCell;
  }
  path.unshift(graph.startCell);

  return path;
};