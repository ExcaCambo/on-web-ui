// Copyright 2015, EMC, Inc.

import { EventEmitter } from 'events';

import React, { Component, PropTypes } from 'react';
import radium from 'radium';

import Toggle from 'material-ui/Toggle';

import SplitView from 'src-common/views/SplitView';

import RackHDRestAPIv1_1 from 'src-common/messengers/RackHDRestAPIv1_1';

import ConfigStore from 'src-common/stores/ConfigStore';
import LookupStore from 'src-common/stores/LookupStore';
import NodeStore from 'src-common/stores/NodeStore';
// import SkuStore from 'src-common/stores/SkuStore';
import WorkflowStore from 'src-common/stores/WorkflowStore';
import WorkflowTemplateStore from 'src-common/stores/WorkflowTemplateStore';

import RackHDGraph from '../lib/RackHDGraph';

import NetworkTopologyGraph from './NetworkTopologyGraph';
import NetworkTopologyInspector from './NetworkTopologyInspector';

@radium
export default class NetworkTopology extends Component {

  static defaultProps = {
    css: {},
    params: null,
    style: {}
  };

  static contextTypes = {
    parentSplit: PropTypes.any
  };

  static childContextTypes = {
    networkTopology: PropTypes.any
  };

  getChildContext() {
    return {
      networkTopology: this
    };
  }

  state = {
    config: null,
    graph: new RackHDGraph(this),
    loading: true,
    lookups: null,
    nodes: null,
    selected: [],
    split: 0.7
  };

  css = {
    root: {
      position: 'relative',
      overflow: 'hidden',
      transition: 'width 1s'
    }
  };

  config = new ConfigStore();
  lookups = new LookupStore();
  nodes = new NodeStore();
  // skus = new SkuStore();
  workflows = new WorkflowStore();
  workflowTemplates = new WorkflowTemplateStore();

  componentWillMount() {
    this.lookups.startMessenger();
    this.nodes.startMessenger();
    // this.skus.list().then(() => {
    //   let virtualBoxInstallCentOsSKU = this.skus.all().filter(sku => {
    //     return sku.name === 'VirtualBox Install CentOS';
    //   })[0];
    //   if (!virtualBoxInstallCentOsSKU) {
    //     this.skus.create({
    //       name: 'VirtualBox Install CentOS',
    //       discoveryGraphName: 'Graph.VirtualBox.InstallCentOS',
    //       discoveryGraphOptions: {},
    //       rules: [
    //         {
    //           path: 'dmi.System Information.Product Name',
    //           equals: 'VirtualBox'
    //         }
    //       ]
    //     });
    //   }
    // });
    this.workflowTemplates.list().then(() => {
      let virtualBoxInstallCentOsGraph = this.workflowTemplates.all().filter(graph => {
        return graph.friendlyName === 'Graph.VirtualBox.InstallCentOS';
      });
      if (!virtualBoxInstallCentOsGraph) {
        return this.workflowTemplates.create('Graph.VirtualBox.InstallCentOS', {
          friendlyName: 'VirtualBox Install CentOS',
          injectableName: 'Graph.VirtualBox.InstallCentOS',
          tasks: [
            {
              label: 'install-centos',
              taskName: 'Task.Os.Install.CentOS'
            }
          ],
          options: {
            defaults: {
              obmServiceName: 'vbox-obm-service'
            },
            'install-centos': {
              version: '7'
            }
          }
        });
      }
    });
  }

  componentDidMount() {
    this.unwatchConfig = this.config.watchOne('config', 'config', this);
    this.unwatchLookups = this.lookups.watchAll('lookups', this);
    this.unwatchNodes = this.nodes.watchAll('nodes', this);
    this.load();
    this.listInterval = setInterval(() => {
      if (this.state.graph.root.node) {
        this.listRackHDContainers(this.state.graph.root.node);
      }
    }, 1000 * 10);
  }

  componentWillUnmount() {
    this.unwatchConfig();
    this.unwatchLookups();
    this.unwatchNodes();
    this.lookups.stopMessenger();
    this.nodes.stopMessenger();
    clearInterval(this.listInterval);
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      this.state.nodes !== prevState.nodes ||
      this.state.lookups !== prevState.lookups ||
      this.state.graph !== prevState.graph
    ) {
      this.state.graph.update(() => {
        this.refs.splitView.refs.inspector.forceUpdate();
      });
    }
  }

  load() {
    this.setState({loading: true});
    Promise.all([
      this.config.read(),
      this.lookups.list(),
      this.nodes.list()
    ]).then(() => {
      this.setState({loading: false});
      let localRackHD = this.nodes.all().filter(node => {
        return node.name === 'Local RackHD';
      })[0];
      if (!localRackHD) {
        return this.nodes.create({
          name: 'Local RackHD',
          type: 'compute',
          docker: {
            hostOptions: {
              host: '127.0.0.1',
              port: 4243
            }
          }
        }).then(this.listRackHDContainers.bind(this));
      }
      this.listRackHDContainers(localRackHD);
    });
  }

  listRackHDContainers(localRackHD) {
    return RackHDRestAPIv1_1.nodes.postWorkflow(localRackHD.id, {
      node: localRackHD.id,
      name: 'Graph.Docker.ListContainers'
    });
  }

  startContainer(containerNodeId) {
    return RackHDRestAPIv1_1.nodes.postWorkflow(containerNodeId, {
      node: containerNodeId,
      name: 'Graph.Docker.Start'
    });
  }

  stopContainer(containerNodeId) {
    return RackHDRestAPIv1_1.nodes.postWorkflow(containerNodeId, {
      node: containerNodeId,
      name: 'Graph.Docker.Stop'
    });
  }

  toggleForceGraph() {
    // console.log('GOT HERE')
    let autoStart = !this.state.graph.forceGraphStarted;
    this.state.graph.stop(true);
    this.state.graph.reset(true);
    this.setState({
      graph: new RackHDGraph(this, autoStart)
    });
  }

  render() {
    let { props, state } = this;

    let parentSplitView = this.context.parentSplit,
        height = parentSplitView.height * parentSplitView.splitB,
        width = parentSplitView.width;

    let css = {
      root: [
        this.css.root,
        props.css.root,
        { width, height },
        this.props.style
      ]
    };

    let overlay = [];

    return (
      <div ref="root" className="NetworkTopology" style={css.root}>
        <div style={{position: 'absolute', top: 5, left: 5, width: 200, height: 40}}>
          <Toggle
            label={state.graph && !state.graph.forceGraphStarted ?
              'Enable Force Graph' : 'Disable Force Graph'}
            defaultToggled={state.graph && state.graph.forceGraphStarted}
            onToggle={this.toggleForceGraph.bind(this)} />
          <a href="#/nt" onClick={() => this.forceUpdate()}>REFRESH</a>
        </div>
        <SplitView key="sv"
            ref="splitView"
            split={this.state.split}
            collapse={1}
            width={width}
            height={height}
            css={{
              root: {transition: 'width 1s'},
              a: {transition: 'width 1s'},
              b: {transition: 'width 1s, left 1s'},
              resize: {transition: 'width 1s, left 1s'}
            }}
            onUpdate={(splitView) => this.setState({split: splitView.state.split})}
            a={({ width, height }) => <NetworkTopologyGraph ref="graph"
              width={width}
              height={height}
              updateSelection={(selected) => {
                this.setState({selected: selected.map(selectedItem => selectedItem.props.initialId)});
              }} />}
            b={({ width, height }) => <NetworkTopologyInspector ref="inspector"
              width={width}
              height={height}
              graph={this.state.graph}
              selected={this.state.selected}  />} />
      </div>
    );
  }

}
