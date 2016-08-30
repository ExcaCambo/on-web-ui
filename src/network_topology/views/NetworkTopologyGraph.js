// Copyright 2015, EMC, Inc.

import { EventEmitter } from 'events';

import React, { Component, PropTypes } from 'react';
import radium from 'radium';

import GraphCanvas from 'src-graph-canvas/views/GraphCanvas';

import cloneDeep from 'lodash/cloneDeep';
import merge from 'lodash/merge';

@radium
export default class NetworkTopologyGraph extends Component {

  static propTypes = {
    css: PropTypes.object,
    height: PropTypes.number,
    styles: PropTypes.object,
    width: PropTypes.number,
    worldHeight: PropTypes.number,
    worldWidth: PropTypes.number
  };

  static defaultProps = {
    css: {},
    height: 300,
    styles: {},
    width: 300,
    worldHeight: 3000,
    worldWidth: 3000
  };

  static contextTypes = {
    networkTopology: PropTypes.any
  };

  static childContextTypes = {
    networkTopologyGraph: PropTypes.any
  };

  getChildContext() {
    return {
      networkTopologyGraph: this
    };
  }

  componentWillReceiveProps(nextProps) {
    let nextState = {};
    if (nextProps.worldHeight) { nextState.worldHeight = nextProps.worldHeight; }
    if (nextProps.worldWidth) { nextState.worldWidth = nextProps.worldWidth; }
    if (nextProps.height) { nextState.canvasHeight = nextProps.height; }
    if (nextProps.width) { nextState.canvasWidth = nextProps.width; }
    this.setState(nextState);
  }

  state = {
    canvasHeight: this.props.height,
    canvasWidth: this.props.width,
    graphLinks: [],
    graphNodes: [],
    version: 0,
    worldHeight: this.props.worldHeight,
    worldWidth: this.props.worldWidth
  };

  css = {
    root: {
      transition: 'width 1s'
    }
  };

  render() {
    let css = {
      root: [this.css.root, this.props.css.root, this.props.style]
    };

    return (
      <div className="NetworkTopologyGraph" ref="root" style={css.root}>
        <GraphCanvas
            key={'graphCanvas' + this.state.version}
            ref="graphCanvas"
            grid={{}}
            scale={this.lastGraphCanvas ? this.lastGraphCanvas.state.scale : 0.5}
            x={this.lastGraphCanvas ? this.lastGraphCanvas.state.position.x : 0}
            y={this.lastGraphCanvas ? this.lastGraphCanvas.state.position.y : 0}
            viewHeight={this.state.canvasHeight}
            viewWidth={this.state.canvasWidth}
            worldHeight={this.state.worldHeight}
            worldWidth={this.state.worldWidth}
            limitSelected={true}
            onSelect={(selected) => this.props.updateSelection(selected)}
            onChange={(graphCanvas) => this.lastGraphCanvas = graphCanvas}>
          {this.state.graphNodes}
          {this.state.graphLinks}
        </GraphCanvas>
      </div>
    );
  }

}
