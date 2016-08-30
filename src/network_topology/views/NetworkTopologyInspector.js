// Copyright 2015, EMC, Inc.

import { EventEmitter } from 'events';

import React, { Component, PropTypes } from 'react';
import radium from 'radium';

import TreeView from 'react-treeview';

import SplitView from 'src-common/views/SplitView';
import Node from 'src-management-console/views/nodes/Node';

@radium
export default class networkTopologyInspector extends Component {

  static defaultProps = {
    css: {},
    params: null,
    style: {}
  };

  static contextTypes = {
    parentSplit: PropTypes.any,
    networkTopology: PropTypes.any
  };

  static childContextTypes = {
    networkTopologyInspector: PropTypes.any
  };

  getChildContext() {
    return {
      networkTopologyInspector: this
    };
  }

  state = {
    split: 0.4,
    selected: this.props.selected,
    graph: this.props.graph,
    forceGraphStarted: this.props.forceGraphStarted
  };

  css = {
    root: {
      position: 'relative',
      overflow: 'hidden',
      transition: 'width 1s'
    }
  };

  componentWillReceiveProps(nextProps) {
    let nextState = {};
    if (nextProps.graph) { nextState.graph = nextProps.graph; }
    if (nextProps.forceGraphStarted) {
      nextState.forceGraphStarted = nextProps.forceGraphStarted;
    }
    if (nextProps.selected) {
      nextState.selected = nextProps.selected;
    }
    this.setState(nextState);
  }

  render() {
    let { props, state } = this;

    let css = {
      root: [
        this.css.root,
        props.css.root,
        { width: props.width, height: props.height },
        this.props.style
      ]
    };

    const renderHardwareTree = (children) => {
      return <ul>
        {children.map((child, i) => {
          if (!child) return null;
          let nodeLink = linkNode(child);
          if (child.children && child.children.length) {
            return (<TreeView nodeLabel={nodeLink} key={i}>
              {renderHardwareTree(child.children)}
            </TreeView>);
          }
          return <li key={i}>{nodeLink}</li>;
        })}
      </ul>;
    };

    const linkNode = (node) => {
      if (!node) return null;
      const id = node.id;
      return <a href="#/nt"
        style={{
          textDecoration: this.state.selected.indexOf(id) === -1 ? 'none' : 'underline'
        }}
        onClick={() => {
          const graph = this.context.networkTopology.refs.splitView.refs.graph.refs.graphCanvas;
          // debugger;
          const node = graph.lookup(id);
          if (node) {
            node.toggleSelected();
          }
        }}>{node.name}</a>;
    };

    // console.log(state.graph);
    let treeView = state.graph && state.graph.root && (
      <TreeView nodeLabel={linkNode(state.graph.root.node)}>
        <TreeView nodeLabel="Docker Services">
          <ul>
            {state.graph.root.dockerContainers.map((node, i) => {
              return <li key={i}>{linkNode(node)}</li>;
            })}
          </ul>
        </TreeView>
        <TreeView nodeLabel="Hardware Resources">
          {renderHardwareTree(state.graph.root.children)}
        </TreeView>
      </TreeView>
    );

    return (
      <div ref="root" style={css.root}>
        <SplitView key="sv"
            ref="splitView"
            orientation="vertical"
            split={this.state.split}
            collapse={1}
            width={props.width}
            height={props.height}
            // css={{
              // root: {transition: 'width 1s'},
              // a: {transition: 'width 1s'},
              // b: {transition: 'width 1s, left 1s'},
              // resize: {transition: 'width 1s, left 1s'}
            // }}
            onUpdate={(splitView) => this.setState({split: splitView.state.split})}
            a={({ width, height }) => {
              return (<div style={{height, overflow: 'auto'}}>
                {treeView}
              </div>);
            }}
            b={({ width, height }) => {
              let node = null;
              const nodes = this.context.networkTopology.state.nodes;
              const selectedNode = nodes && nodes.filter(otherNode => {
                return otherNode.id === state.selected[0];
              })[0];
              // console.log(selectedNode);
              node = state.selected && state.selected.length ?
                <Node params={{nodeId: state.selected[0]}} noWorkflows={true} noPollers={true} noConsole={true} /> : null;
              return (<div style={{height, overflow: 'auto'}}>
                {/* {state.selected}<br/> */}
                {selectedNode && selectedNode.isDockerContainer && <div>
                  {selectedNode.docker.container.Status}<br/>
                  {selectedNode.docker.container.State === 'running' ?
                    <a href="#/nt" onClick={() => {
                      this.context.networkTopology.stopContainer(selectedNode.id);
                    }}>Stop Service</a> :
                    <a href="#/nt" onClick={() => {
                      this.context.networkTopology.startContainer(selectedNode.id);
                    }}>Start Service</a>}
                </div>}
                {node}
              </div>);
            }} />
      </div>
    );
  }

}
