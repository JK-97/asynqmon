import React from "react";
import { connect, ConnectedProps } from "react-redux";
import { useHistory } from "react-router-dom";
import TableRow from "@material-ui/core/TableRow";
import TableCell from "@material-ui/core/TableCell";
import Checkbox from "@material-ui/core/Checkbox";
import IconButton from "@material-ui/core/IconButton";
import Tooltip from "@material-ui/core/Tooltip";
import FileCopyOutlinedIcon from "@material-ui/icons/FileCopyOutlined";
import DeleteIcon from "@material-ui/icons/Delete";
import ArchiveIcon from "@material-ui/icons/Archive";
import MoreHorizIcon from "@material-ui/icons/MoreHoriz";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import { makeStyles } from "@material-ui/core/styles";
import SyntaxHighlighter from "./SyntaxHighlighter";
import TasksTable, { RowProps, useRowStyles } from "./TasksTable";
import {
  batchDeleteScheduledTasksAsync,
  batchRunScheduledTasksAsync,
  batchArchiveScheduledTasksAsync,
  deleteAllScheduledTasksAsync,
  runAllScheduledTasksAsync,
  archiveAllScheduledTasksAsync,
  listScheduledTasksAsync,
  deleteScheduledTaskAsync,
  runScheduledTaskAsync,
  archiveScheduledTaskAsync,
} from "../actions/tasksActions";
import { taskRowsPerPageChange } from "../actions/settingsActions";
import { AppState } from "../store";
import { TableColumn } from "../types/table";
import { durationBefore, formatPayload, FormattedPayload, uuidPrefix } from "../utils";
import { taskDetailsPath } from "../paths";

function mapStateToProps(state: AppState) {
  return {
    loading: state.tasks.scheduledTasks.loading,
    error: state.tasks.scheduledTasks.error,
    tasks: state.tasks.scheduledTasks.data,
    batchActionPending: state.tasks.scheduledTasks.batchActionPending,
    allActionPending: state.tasks.scheduledTasks.allActionPending,
    pollInterval: state.settings.pollInterval,
    pageSize: state.settings.taskRowsPerPage,
  };
}

const mapDispatchToProps = {
  listTasks: listScheduledTasksAsync,
  batchDeleteTasks: batchDeleteScheduledTasksAsync,
  batchRunTasks: batchRunScheduledTasksAsync,
  batchArchiveTasks: batchArchiveScheduledTasksAsync,
  deleteAllTasks: deleteAllScheduledTasksAsync,
  runAllTasks: runAllScheduledTasksAsync,
  archiveAllTasks: archiveAllScheduledTasksAsync,
  deleteTask: deleteScheduledTaskAsync,
  runTask: runScheduledTaskAsync,
  archiveTask: archiveScheduledTaskAsync,
  taskRowsPerPageChange,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

type ReduxProps = ConnectedProps<typeof connector>;

interface Props {
  queue: string; // name of the queue.
  totalTaskCount: number; // totoal number of scheduled tasks.
}

const columns: TableColumn[] = [
  { key: "id", label: "ID", align: "left" },
  { key: "type", label: "Type", align: "left" },
  { key: "payload", label: "Payload", align: "left" },
  { key: "process_in", label: "Process In", align: "left" },
  { key: "actions", label: "Actions", align: "center" },
];

const useJsonCellStyles = makeStyles(() => ({
  preview: {
    maxHeight: 120,
    overflow: "hidden",
  },
  tooltip: {
    maxWidth: 960,
    padding: 0,
  },
  tooltipContent: {
    maxHeight: "70vh",
    maxWidth: "80vw",
    minWidth: 520,
    overflow: "auto",
  },
}));

function Row(props: RowProps) {
  const { task } = props;
  const classes = useRowStyles();
  const jsonCellClasses = useJsonCellStyles();
  const history = useHistory();
  const payload = React.useMemo(
    () => formatPayload(task.payload),
    [task.payload]
  );
  const previewStyle = React.useMemo(
    () => ({
      margin: 0,
      maxWidth: 400,
      fontSize: 14,
      lineHeight: "1.6",
    }),
    []
  );
  const tooltipStyle = React.useMemo(
    () => ({
      margin: 0,
      fontSize: 16,
      lineHeight: "1.6",
    }),
    []
  );
  const renderPayloadCell = (payload: FormattedPayload) => (
    <Tooltip
      title={
        <div className={jsonCellClasses.tooltipContent}>
          <SyntaxHighlighter
            language={payload.language}
            customStyle={tooltipStyle}
            wrapLongLines={false}
          >
            {payload.text}
          </SyntaxHighlighter>
        </div>
      }
      interactive
      classes={{ tooltip: jsonCellClasses.tooltip }}
      enterDelay={200}
    >
      <div className={jsonCellClasses.preview}>
        <SyntaxHighlighter
          language={payload.language}
          customStyle={previewStyle}
          wrapLongLines={false}
        >
          {payload.text}
        </SyntaxHighlighter>
      </div>
    </Tooltip>
  );
  return (
    <TableRow
      key={task.id}
      className={classes.root}
      selected={props.isSelected}
      onClick={() => history.push(taskDetailsPath(task.queue, task.id))}
    >
      {!window.READ_ONLY && (
        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
          <IconButton>
            <Checkbox
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                props.onSelectChange(event.target.checked)
              }
              checked={props.isSelected}
            />
          </IconButton>
        </TableCell>
      )}
      <TableCell component="th" scope="row" className={classes.idCell}>
        <div className={classes.IdGroup}>
          {uuidPrefix(task.id)}
          <Tooltip title="Copy full ID to clipboard">
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(task.id);
              }}
              size="small"
              className={classes.copyButton}
            >
              <FileCopyOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>
      </TableCell>
      <TableCell>{task.type}</TableCell>
      <TableCell>
        {renderPayloadCell(payload)}
      </TableCell>
      <TableCell>{durationBefore(task.next_process_at)}</TableCell>
      {!window.READ_ONLY && (
        <TableCell
          align="center"
          className={classes.actionCell}
          onMouseEnter={props.onActionCellEnter}
          onMouseLeave={props.onActionCellLeave}
          onClick={(e) => e.stopPropagation()}
        >
          {props.showActions ? (
            <React.Fragment>
              <Tooltip title="Delete">
                <IconButton
                  onClick={props.onDeleteClick}
                  disabled={task.requestPending || props.allActionPending}
                  size="small"
                  className={classes.actionButton}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Archive">
                <IconButton
                  onClick={props.onArchiveClick}
                  disabled={task.requestPending || props.allActionPending}
                  size="small"
                  className={classes.actionButton}
                >
                  <ArchiveIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Run">
                <IconButton
                  onClick={props.onRunClick}
                  disabled={task.requestPending || props.allActionPending}
                  size="small"
                  className={classes.actionButton}
                >
                  <PlayArrowIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </React.Fragment>
          ) : (
            <IconButton size="small" onClick={props.onActionCellEnter}>
              <MoreHorizIcon fontSize="small" />
            </IconButton>
          )}
        </TableCell>
      )}
    </TableRow>
  );
}

function ScheduledTasksTable(props: Props & ReduxProps) {
  return (
    <TasksTable
      taskState="scheduled"
      columns={columns}
      renderRow={(rowProps: RowProps) => <Row {...rowProps} />}
      {...props}
    />
  );
}

export default connector(ScheduledTasksTable);
