/**
 * Copyright (c) 2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule FixedDataTableCell.react
 * @typechecks
 */

var FixedDataTableCellDefault = require('FixedDataTableCellDefault.react');
var FixedDataTableColumnReorderHandle = require('./FixedDataTableColumnReorderHandle.react');
var FixedDataTableHelper = require('FixedDataTableHelper');
var React = require('React');
var cx = require('cx');
var joinClasses = require('joinClasses');

var DIR_SIGN = FixedDataTableHelper.DIR_SIGN;

var {PropTypes} = React;

var DEFAULT_PROPS = {
  align: 'left',
  highlighted: false,
};

var FixedDataTableCell = React.createClass({

  /**
   * PropTypes are disabled in this component, because having them on slows
   * down the FixedDataTable hugely in DEV mode. You can enable them back for
   * development, but please don't commit this component with enabled propTypes.
   */
  propTypes_DISABLED_FOR_PERFORMANCE: {
    isScrolling: PropTypes.bool,
    align: PropTypes.oneOf(['left', 'center', 'right']),
    className: PropTypes.string,
    highlighted: PropTypes.bool,
    width: PropTypes.number.isRequired,
    minWidth: PropTypes.number,
    maxWidth: PropTypes.number,
    height: PropTypes.number.isRequired,

    cell: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.element,
      PropTypes.func,
    ]),

    columnKey: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
    ]),

    /**
     * The row index that will be passed to `cellRenderer` to render.
     */
    rowIndex: PropTypes.number.isRequired,

    /**
     * Callback for when resizer knob (in FixedDataTableCell) is clicked
     * to initialize resizing. Please note this is only on the cells
     * in the header.
     * @param number combinedWidth
     * @param number left
     * @param number width
     * @param number minWidth
     * @param number maxWidth
     * @param number|string columnKey
     * @param object event
     */
    onColumnResize: PropTypes.func,
    onColumnReorder: PropTypes.func,

    /**
     * The left offset in pixels of the cell.
     */
    left: PropTypes.number,
  },

  getInitialState() {
    return {
      isReorderingThisColumn: false,
      displacement: 0,
      reorderingDisplacement: 0
    };
  },

  shouldComponentUpdate(nextProps) {
    return (
      !nextProps.isScrolling ||
      this.props.rowIndex !== nextProps.rowIndex
    );
  },

  componentWillReceiveProps(props) {
    var left = props.left + this.state.displacement;

    var newState = {
      isReorderingThisColumn: false
    };

    if (props.isColumnReordering) {
      var originalLeft = props.columnReorderingData.originalLeft;
      var reorderCellLeft = originalLeft + props.columnReorderingData.dragDistance;
      var farthestPossiblePoint = props.columnGroupWidth - props.columnReorderingData.columnWidth;

      // ensure the cell isn't being dragged out of the column group
      reorderCellLeft = Math.max(reorderCellLeft, 0);
      reorderCellLeft = Math.min(reorderCellLeft, farthestPossiblePoint);

      if (props.columnKey === props.columnReorderingData.columnKey) {
        newState.displacement = reorderCellLeft - props.left;
        newState.isReorderingThisColumn = true;

      } else {
        var theTurningPoint = left + (props.width / 2) - (props.columnReorderingData.columnWidth / 2);
        theTurningPoint = Math.max(theTurningPoint, 0);
        theTurningPoint = Math.min(theTurningPoint, farthestPossiblePoint);

        // cell is before the one being dragged
        if (originalLeft > props.left) {
          if (reorderCellLeft <= theTurningPoint) {
            newState.displacement = props.columnReorderingData.columnWidth;
            if (!props.columnReorderingData.columnAfter) {
              props.columnReorderingData.columnAfter = props.columnKey;
            }
          } else {
            newState.displacement = 0;
            props.columnReorderingData.columnBefore = props.columnKey;
          }
        }

        // cell is after the one being dragged
        if (originalLeft < props.left) {
          if (reorderCellLeft >= theTurningPoint) {
            newState.displacement = -props.columnReorderingData.columnWidth;
            props.columnReorderingData.columnBefore = props.columnKey;
          } else {
            newState.displacement = 0;
            if (!props.columnReorderingData.columnAfter) {
              props.columnReorderingData.columnAfter = props.columnKey;
            }
          }
        }
      }
    } else {
      newState.displacement = 0;
    }

    this.setState(newState);
  },

  getDefaultProps() /*object*/ {
    return DEFAULT_PROPS;
  },

  render() /*object*/ {

    var {height, width, columnKey, ...props} = this.props;

    var style = {
      height,
      width,
    };

    if (DIR_SIGN === 1) {
      style.left = props.left + this.state.displacement;
    } else {
      style.right = props.left + this.state.displacement;
    }

    if (this.state.isReorderingThisColumn) {
      style.zIndex = 1;
    }

    var className = joinClasses(
      cx({
        'fixedDataTableCellLayout/main': true,
        'fixedDataTableCellLayout/lastChild': props.lastChild,
        'fixedDataTableCellLayout/alignRight': props.align === 'right',
        'fixedDataTableCellLayout/alignCenter': props.align === 'center',
        'public/fixedDataTableCell/alignRight': props.align === 'right',
        'public/fixedDataTableCell/highlighted': props.highlighted,
        'public/fixedDataTableCell/main': true,
        'public/fixedDataTableCell/reordering': this.state.isReorderingThisColumn,
      }),
      props.className,
    );

    var columnResizerComponent;
    if (props.onColumnResize) {
      var columnResizerStyle = {
        height
      };
      columnResizerComponent = (
        <div
          className={cx('fixedDataTableCellLayout/columnResizerContainer')}
          style={columnResizerStyle}
          onMouseDown={this._onColumnResizerMouseDown}>
          <div
            className={joinClasses(
              cx('fixedDataTableCellLayout/columnResizerKnob'),
              cx('public/fixedDataTableCell/columnResizerKnob'),
            )}
            style={columnResizerStyle}
          />
        </div>
      );
    }

    var columnReorderComponent;
    if (props.onColumnReorder) { //header row
      columnReorderComponent = (
        <FixedDataTableColumnReorderHandle
          columnKey={this.columnKey}
          onMouseDown={this._onColumnReorderMouseDown}
          height={height}
          {...this.props}
        />
      );
    }

    var cellProps = {
      columnKey,
      height,
      width
    };

    if (props.rowIndex >= 0) {
      cellProps.rowIndex = props.rowIndex;
    }

    var content;
    if (React.isValidElement(props.cell)) {
      content = React.cloneElement(props.cell, cellProps);
    } else if (typeof props.cell === 'function') {
      content = props.cell(cellProps);
    } else {
      content = (
        <FixedDataTableCellDefault
          {...cellProps}>
          {props.cell}
        </FixedDataTableCellDefault>
      );
    }

    return (
      <div className={className} style={style}>
        {columnResizerComponent}
        {columnReorderComponent}
        {content}
      </div>
    );
  },

  _onColumnResizerMouseDown(/*object*/ event) {
    this.props.onColumnResize(
      this.props.left,
      this.props.width,
      this.props.minWidth,
      this.props.maxWidth,
      this.props.columnKey,
      event
    );
  },

  _onColumnReorderMouseDown(/*object*/ event) {
    this.props.onColumnReorder(
      this.props.columnKey,
      this.props.width,
      this.props.left,
      event
    );
  },
});

module.exports = FixedDataTableCell;
