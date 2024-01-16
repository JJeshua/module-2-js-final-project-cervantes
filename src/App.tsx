import { useReducer, useEffect, useState } from "react";
import { Cell } from "./ts/cell";
import { ECellType } from "./ts/enums/cell.enums";
import { GraphHelper } from "./ts/GraphHelper";
import { TGraphAction } from "./ts/types/GraphHelper.types";
import { TGraph } from "./ts/types/GraphHelper.types";
import { EGraphActions } from "./ts/enums/GraphHelper.enums";
import { EGraphAlgorithms } from "./ts/enums/GraphHelper.enums";
import { TUpdateGraphPayload } from "./ts/types/GraphHelper.types";
import { TSetGraphPayload } from "./ts/types/GraphHelper.types";
import "./App.css";
import { CellNode } from "./components/CellNode";
import { AlertMessage } from "./components/AlertMessage";
import { dijkstra, dijkstraBackTrack } from "./ts/Dijkstra";
import { TDijkstraState } from "./ts/types/Dijkstra.types";
import { generateMaze } from "./ts/RecursiveBacktracking";

import shuffleIcon from "./assets/icons/shuffleSolid.svg";
import OverlayDisable from "./components/OverlayDisable";
import { ETraceAnimationSpeed } from "./ts/enums/animation.enums";

// ---------------------------------------------------------
// DO NOT CHANGE!!!
// TODO: Make columns and rows dynamic. As of now, must be
//  hard coded because of CSS styling
const ROWS = 21;
const COLS = 41;
// ---------------------------------------------------------

// Reducer function to update a cell's style in the grid
// Parameters:
// - state: The current state of the grid (2D array of cells).
// - action: The action object containing information about the update.
// Return Value:
// - A new state representing the updated grid after applying the action.
const graphReducer = (state: TGraph, action: TGraphAction): TGraph => {
  switch (action.type) {
    case EGraphActions.SetGraph:
      return {
        ...state,
        graph: action.payload.graph,
      };

    case EGraphActions.UpdateCell:
      const updatedGraph = state.graph.map((row, rowIndex) =>
        rowIndex === action.payload.row
          ? row.map((cell, colIndex) =>
              colIndex === action.payload.col
                ? {
                    ...cell,
                    cellType: action.payload.cellType,
                  }
                : cell
            )
          : row
      );

      return {
        ...state,
        graph: updatedGraph,
      };

    case EGraphActions.InitializeGraph:
      return {
        ...state,
        graph: GraphHelper.generateGraph(
          action.payload.rows,
          action.payload.columns
        ),
        startCell: undefined,
        finishCell: undefined,
      };

    default:
      return state;
  }
};

let dijkstraState: TDijkstraState = {
  selectedCellTypeToPlace: ECellType.Start,
  distances: undefined,
  path: undefined,
  visited: undefined,
};

const initialGraph: TGraph = {
  startCell: undefined,
  finishCell: undefined,
  graph: [],
};

function App() {
  const [graph, dispatch] = useReducer(graphReducer, initialGraph);
  const [traceSearchSpeed, setTraceSearchSpeed] =
    useState<ETraceAnimationSpeed>(ETraceAnimationSpeed.SPEED_TWO);
  const [tracePathSpeed, setTracePathSpeed] = useState<ETraceAnimationSpeed>(
    ETraceAnimationSpeed.SPEED_TWO
  );
  const [traceMazeGenerationSpeed, setTraceMazeGenerationSpeed] =
    useState<ETraceAnimationSpeed>(ETraceAnimationSpeed.SPEED_THREE);

  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);

  const [selectedCellTypeToPlace, setSelectedCellTypeToPlace] =
    useState<ECellType>(ECellType.Normal);

  const [currentAlgorithm, setCurrentAlgorithm] =
    useState<EGraphAlgorithms | null>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMessage, setModalMessage] = useState<string>(
    "Error, invalid input"
  );
  const [overlayDisable, setOverlayDisable] = useState<boolean>(false);

  // Function to initialize the graph
  // Return Value: None (dispatches an action to update the grid state)
  const initializeGraph = (): void => {
    let rows = ROWS;
    let columns = COLS;
    dispatch({
      type: EGraphActions.InitializeGraph,
      payload: { rows, columns },
    });
  };

  const setAllCellsToNormalExceptWallsStartFinish = () => {
    const updatedGraphWithoutWalls: Cell[][] = graph.graph.map((row) =>
      row.map((cell) =>
        cell.cellType === ECellType.Wall ||
        cell.cellType === ECellType.Start ||
        cell.cellType === ECellType.Finish
          ? cell
          : { ...cell, cellType: ECellType.Normal }
      )
    );

    let data: TSetGraphPayload = {
      graph: updatedGraphWithoutWalls,
    };

    dispatch({
      type: EGraphActions.SetGraph,
      payload: data,
    });

    // set the start cell and finish cell styles back
    updateCell(
      graph.startCell!.posRow!,
      graph.startCell!.posCol!,
      ECellType.Start
    );

    updateCell(
      graph.finishCell!.posRow!,
      graph.finishCell!.posCol!,
      ECellType.Finish
    );
  };

  // initialize graph on initial load
  useEffect(() => {
    initializeGraph();
  }, []);

  // Handles resetting the graph to initial state
  const handleResetGraphButton = (): void => {
    initializeGraph();
    dijkstraState = {
      selectedCellTypeToPlace: ECellType.Start,
      distances: undefined,
      path: undefined,
      visited: undefined,
    };
  };

  // Handle clicking the desired path finding algorithm
  const handleSelectAlgorithmBtn = (clicked: EGraphAlgorithms): void => {
    setCurrentAlgorithm(clicked);
  };

  // Handle clicking the desired speed for tracing the search
  const handleTraceSearchSpeedBtns = (speed: ETraceAnimationSpeed) => {
    setTraceSearchSpeed(speed);
  };

  // Handle clicking the desired speed for tracing the path
  const handleTracePathSpeedBtns = (speed: ETraceAnimationSpeed) => {
    setTracePathSpeed(speed);
  };

  // Handle clicking the desired speed for tracing the path
  const handleTraceMazeGenerationSpeedBtns = (speed: ETraceAnimationSpeed) => {
    setTraceMazeGenerationSpeed(speed);
  };

  // Handle clicking on the desired cell to place in the graph
  // Parameters:
  // - cellClicked: The CellStyle to be set to the current cell being placed
  // e.g. CellStyles.Start, CellStyles.Finish.
  const handleCellTypeToPlace = (cellType: ECellType): void => {
    setSelectedCellTypeToPlace(cellType);
  };

  // Function to update a cell in the grid
  // Parameters:
  // - row: The row index of the cell to be updated.
  // - col: The column index of the cell to be updated.
  // - type: The new type to be assigned to the cell.
  // Return Value: None (dispatches an action to update the grid state)
  const updateCell = (row: number, col: number, cellType: ECellType): void => {
    dispatch({
      type: EGraphActions.UpdateCell,
      payload: { row, col, cellType },
    });
  };

  // Handles updating the clicked cell based on the current desired
  // cell to place e.g. Start, Finish, Wall.
  const handleCellClick = (
    row: number,
    col: number,
    cellType?: ECellType
  ): void => {
    if (
      GraphHelper.getCell(graph, row, col).cellType === ECellType.Start ||
      GraphHelper.getCell(graph, row, col).cellType === ECellType.Finish
    ) {
      return;
    }
    // set the clicked cell to the desired type
    cellType = selectedCellTypeToPlace;
    dispatch({
      type: EGraphActions.UpdateCell,
      payload: { row, col, cellType },
    });

    // if the user is currently placing a start cell, then set the
    // previous start cell to normal, and update the clicked cell
    // to a start cell
    if (cellType === ECellType.Start) {
      // update previous start cell
      if (graph.startCell !== undefined) {
        let data: TUpdateGraphPayload = {
          row: graph.startCell.posRow,
          col: graph.startCell.posCol,
          cellType: ECellType.Normal,
        };
        dispatch({
          type: EGraphActions.UpdateCell,
          payload: data,
        });
      }
      // set new start cell
      graph.startCell = GraphHelper.getCell(graph, row, col);
    }
    // if the user is currently placing a finsh cell, then set the
    // previous finish cell to normal, and update the clicked cell
    // to a finish cell
    else if (cellType === ECellType.Finish) {
      // update previous finish cell
      if (graph.finishCell !== undefined) {
        let data: TUpdateGraphPayload = {
          row: graph.finishCell.posRow,
          col: graph.finishCell.posCol,
          cellType: ECellType.Normal,
        };
        dispatch({
          type: EGraphActions.UpdateCell,
          payload: data,
        });
      }
      // set finish start cell
      graph.finishCell = GraphHelper.getCell(graph, row, col);
    }
  };

  // Function to handle user pressing the go button. If a start and
  // finish cell have been chosen, then the function checks to see
  // which algorithm is chosen, and attempts to run the algorithm,
  // and animate the graph.
  const handleVisualizeBtn = (): void => {
    if (!graph.startCell || !graph.finishCell) {
      setModalMessage("Please place a start and finish cell");
      setIsModalOpen(true);
      return;
    }

    // if the user reruns the visualizer, we need to reset
    // all of the cells that are not walls, start, or finish,
    // so cells that are highlighted showing the path trace or
    // search trace.
    setAllCellsToNormalExceptWallsStartFinish();
    switch (currentAlgorithm) {
      case EGraphAlgorithms.Dijkstra:
        let res: {
          distances: { [key: string]: number };
          visited: Cell[];
        };
        try {
          res = dijkstra(graph);
        } catch (error) {
          setModalMessage("No path from start cell to finish cell");
          setIsModalOpen(true);
          return;
        }

        dijkstraState.distances = res.distances;
        dijkstraState.visited = res.visited;
        dijkstraState.path = dijkstraBackTrack(graph, dijkstraState);
        animateDijkstra();
        break;

      default:
        setModalMessage("Please select an algorithm");
        setIsModalOpen(true);
    }
  };

  const animateDijkstra = async () => {
    if (!dijkstraState.visited || !dijkstraState.path) return;

    setOverlayDisable(true);
    // animate dijkstra searching for finish cell
    for (const cell of dijkstraState.visited) {
      updateCell(cell.posRow, cell.posCol, ECellType.SubtleHighlight);
      await new Promise((resolve) => setTimeout(resolve, traceSearchSpeed));
      if (
        cell.posRow === graph.finishCell?.posRow &&
        cell.posCol === graph.finishCell?.posCol
      )
        break;
    }

    // animate shortest path from start to finish cell
    for (const cell of dijkstraState.path) {
      updateCell(cell.posRow, cell.posCol, ECellType.Highlight);
      await new Promise((resolve) => setTimeout(resolve, tracePathSpeed));
      if (
        cell.posRow === graph.finishCell?.posRow &&
        cell.posCol === graph.finishCell?.posCol
      )
        break;
    }
    setOverlayDisable(false);
  };

  const handleRecursiveBacktrackBtn = async () => {
    setOverlayDisable(true);
    const res = generateMaze(ROWS, COLS);

    // set graph to all walls and reset start and finish cell
    graph.startCell = undefined;
    graph.finishCell = undefined;
    let _data: TSetGraphPayload = {
      graph: GraphHelper.generateAllWallGraph(ROWS, COLS),
    };
    dispatch({
      type: EGraphActions.SetGraph,
      payload: _data,
    });

    // animate recurrsive backtracking
    for (const cell of res.steps) {
      updateCell(cell.posRow, cell.posCol, ECellType.Normal);
      await new Promise((resolve) =>
        setTimeout(resolve, traceMazeGenerationSpeed)
      );
    }

    let data: TSetGraphPayload = {
      graph: res.maze,
    };
    dispatch({
      type: EGraphActions.SetGraph,
      payload: data,
    });
    setOverlayDisable(false);
  };

  // Handles when the user is placing walls and drags across cells
  const handleMouseEnterCell = (row: number, col: number): void => {
    if (!isMouseDown) return;
    handleCellClick(row, col);
  };

  const handleMouseDown = () => {
    setIsMouseDown(true);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="wrapper">
        <OverlayDisable show={overlayDisable} />
        <AlertMessage
          isOpen={isModalOpen}
          onClose={closeModal}
          message={modalMessage}
        ></AlertMessage>
        <div className="navbar">
          <button
            className="visualize-btn"
            onClick={() => handleVisualizeBtn()}
          >
            VISUALIZE
          </button>
          <button
            className="reset-graph"
            onClick={() => handleResetGraphButton()}
          >
            Reset Graph
          </button>
          <hr className="rounded separator" />
          <h3 className="title-medium">Path Finders</h3>
          <div className="dropdown">
            <button className="dropbtn">
              {currentAlgorithm ? currentAlgorithm : "(Select Algorithm)"}
            </button>
            <div className="dropdown-content">
              <div
                className="dropdown-item"
                onClick={() =>
                  handleSelectAlgorithmBtn(EGraphAlgorithms.Dijkstra)
                }
              >
                Dijkstra
              </div>
              {/* <div
                className="dropdown-item"
                onClick={() => handleChooseAlgorithm(GraphAlgorithms.Astar)}
              >
                A*
              </div> */}
            </div>
          </div>

          <div>
            <h4 className="title-small">Trace Search Speed</h4>
            <ul className="selector selector-normal">
              <li
                onClick={() =>
                  handleTraceSearchSpeedBtns(ETraceAnimationSpeed.SPEED_ONE)
                }
                className={
                  traceSearchSpeed === ETraceAnimationSpeed.SPEED_ONE
                    ? "selector-highlight"
                    : "selector-normal"
                }
              >
                1
              </li>
              <li
                onClick={() =>
                  handleTraceSearchSpeedBtns(ETraceAnimationSpeed.SPEED_TWO)
                }
                className={
                  traceSearchSpeed === ETraceAnimationSpeed.SPEED_TWO
                    ? "selector-highlight"
                    : "selector-normal"
                }
              >
                2
              </li>
              <li
                onClick={() =>
                  handleTraceSearchSpeedBtns(ETraceAnimationSpeed.SPEED_THREE)
                }
                className={
                  traceSearchSpeed === ETraceAnimationSpeed.SPEED_THREE
                    ? "selector-highlight"
                    : "selector-normal"
                }
              >
                3
              </li>
            </ul>
          </div>

          <div>
            <h4 className="title-small">Trace Path Speed</h4>
            <ul className="selector selector-normal">
              <li
                onClick={() =>
                  handleTracePathSpeedBtns(ETraceAnimationSpeed.SPEED_ONE)
                }
                className={
                  tracePathSpeed === ETraceAnimationSpeed.SPEED_ONE
                    ? "selector-highlight"
                    : "selector-normal"
                }
              >
                1
              </li>
              <li
                onClick={() =>
                  handleTracePathSpeedBtns(ETraceAnimationSpeed.SPEED_TWO)
                }
                className={
                  tracePathSpeed === ETraceAnimationSpeed.SPEED_TWO
                    ? "selector-highlight"
                    : "selector-normal"
                }
              >
                2
              </li>
              <li
                onClick={() =>
                  handleTracePathSpeedBtns(ETraceAnimationSpeed.SPEED_THREE)
                }
                className={
                  tracePathSpeed === ETraceAnimationSpeed.SPEED_THREE
                    ? "selector-highlight"
                    : "selector-normal"
                }
              >
                3
              </li>
            </ul>
          </div>

          <div className="start-end-selector-container">
            <div
              className={`selector  ${
                selectedCellTypeToPlace === ECellType.Start
                  ? "selector-highlight"
                  : "selector-normal"
              }`}
              onClick={() => handleCellTypeToPlace(ECellType.Start)}
            >
              <div className="cell-start selector-icon"></div>
              <div>Set Start Cell</div>
            </div>
            <div
              className={`selector  ${
                selectedCellTypeToPlace === ECellType.Finish
                  ? "selector-highlight"
                  : "selector-normal"
              }`}
              onClick={() => handleCellTypeToPlace(ECellType.Finish)}
            >
              <div className="cell-finish selector-icon"></div>
              <div>Set Finish Cell</div>
            </div>
            <div
              className={`selector  ${
                selectedCellTypeToPlace === ECellType.Wall
                  ? "selector-highlight"
                  : "selector-normal"
              }`}
              onClick={() => handleCellTypeToPlace(ECellType.Wall)}
            >
              <div className="cell-wall selector-icon "></div>
              <div>Set Wall Cell</div>
            </div>
            <div
              className={`selector  ${
                selectedCellTypeToPlace === ECellType.Normal
                  ? "selector-highlight"
                  : "selector-normal"
              }`}
              onClick={() => handleCellTypeToPlace(ECellType.Normal)}
            >
              <div className="cell-normal selector-icon "></div>
              <div>Set Normal Cell</div>
            </div>
          </div>
          <hr className="rounded separator" />
          <h3 className="title-medium">Maze Generation</h3>
          <div className="maze-generation-selectors-container">
            <div
              className="selector selector-normal"
              onClick={() => handleRecursiveBacktrackBtn()}
            >
              <img
                src={shuffleIcon}
                alt="shuffle icon"
                className="selector-icon"
              />
              <div>Recur. Backtrack</div>
            </div>
          </div>
          <div>
            <h4 className="title-small">Trace Maze Speed</h4>
            <ul className="selector selector-normal">
              <li
                onClick={() =>
                  handleTraceMazeGenerationSpeedBtns(
                    ETraceAnimationSpeed.SPEED_ONE
                  )
                }
                className={
                  traceMazeGenerationSpeed === ETraceAnimationSpeed.SPEED_ONE
                    ? "selector-highlight"
                    : "selector-normal"
                }
              >
                1
              </li>
              <li
                onClick={() =>
                  handleTraceMazeGenerationSpeedBtns(
                    ETraceAnimationSpeed.SPEED_TWO
                  )
                }
                className={
                  traceMazeGenerationSpeed === ETraceAnimationSpeed.SPEED_TWO
                    ? "selector-highlight"
                    : "selector-normal"
                }
              >
                2
              </li>
              <li
                onClick={() =>
                  handleTraceMazeGenerationSpeedBtns(
                    ETraceAnimationSpeed.SPEED_THREE
                  )
                }
                className={
                  traceMazeGenerationSpeed === ETraceAnimationSpeed.SPEED_THREE
                    ? "selector-highlight"
                    : "selector-normal"
                }
              >
                3
              </li>
            </ul>
          </div>
        </div>

        <div
          className="graphWrapper"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        >
          {graph.graph.map((row) =>
            row.map((item) => (
              <CellNode
                key={`${item.posRow}-${item.posCol}`}
                cellType={item.cellType}
                row={item.posRow}
                col={item.posCol}
                onMouseDown={handleCellClick}
                _onMouseEnter={handleMouseEnterCell}
              ></CellNode>
            ))
          )}
        </div>
      </div>
    </>
  );
}

export default App;
