// Copyright 2016, EMC, Inc.

import Springy from 'springy';

import Circle from './Circle';
import PolarVector from './PolarVector';

import Rectangle from 'src-graph-canvas/lib/Rectangle';
import Vector from 'src-graph-canvas/lib/Vector';

import {
    GCGroup,
    GCLink,
    GCNode,
    GCPort,
    GCSocket
  } from 'src-graph-canvas/views/GraphCanvas';

export default class RackHDGraph {
  constructor(networkTopologyView, autoStart) {
    this.networkTopologyView = networkTopologyView;
    this.autoStart = autoStart;
  }

  buildTree() {
    let config = this.networkTopologyView.state.config || {},
        lookups = this.networkTopologyView.state.lookups || [],
        nodes = this.networkTopologyView.state.nodes || [],
        nodeMap = {},
        graph = new Springy.Graph();

    let root = {
      address: config.gatewayaddr,
      graph,
      node: nodes.filter(node => {
        node.data = node.data || {};
        node.data.mass = 1.0;
        graph.addNode(node);
        nodeMap[node.id] = node;
        node.identifiers && node.identifiers.forEach(identifier => {
          nodeMap[identifier] = node;
        });
        return node.name === 'Local RackHD';
      })[0]
    };

    if (!root.node) return;
    // root.node.data.mass = 2.0;

    root.lookups = lookups.filter(lookup => {
      let node = nodeMap[lookup.node] || nodeMap[lookup.macAddress];
      if (node) {
        node.lookups = node.lookups || [];
        if (node.lookups.indexOf(lookup) === -1) {
          if (node !== root.node) {
            graph.newEdge(root.node, node);
            graph.newEdge(node, root.node);
          }
          node.lookups.push(lookup);
        }
        return true;
      }
    });

    root.otherNodes = [];

    root.dockerContainers = nodes.filter(node => {
      if (node.tags.indexOf('dockerHost:' + root.node.id) !== -1) {
        node.isDockerContainer = true;
        node.isRackHDDockerContainer = true;
        // node.data.mass = 1.5;
        graph.newEdge(root.node, node);
        return true;
      }
      if (node.name !== 'Local RackHD') {
        root.otherNodes.push(node);
      }
    });

    root.children = [];

    root.otherNodes.forEach(node => {
      let parent;
      node.relations.forEach(relation => {
        if (!relation) return;
        if (relation.relationType === 'encloses') return;
        if (relation.targets && relation.targets.length === 1) {
          parent = nodeMap[relation.targets[0]];
        }
      });
      if (!parent) {
        graph.newEdge(node, root.node);
        return root.children.push(node);
      }
      parent.children = parent.children || [];
      if (parent.children.indexOf(node) === -1) {
        graph.newEdge(node, parent);
        // node.data.mass = 0.5;
        parent.children.push(node);
      }
    });

    return root;
  }

  start() {
    this.renderer.start();
    this.forceGraphStarted = true;
  }

  stop(clear) {
    this.forceGraphStarted = false;
    if (this.root) {
      if (this.renderer) {
        if (clear) clearTimeout(this.timer);
        this.renderer.stop();
      }
    }
  }

  zero(node) {
    if (node === this.root.node) {
      node.bounds = new Rectangle().fromCenter(300, 300);
    } else {
      node.bounds = new Rectangle().fromCenter(240, 80);
    }
    return node.bounds = node.bounds.translate([1500, 1500]);
  }

  update(callback) {
    const root = this.buildTree();
    if (!root) return;

    this.stop();
    this.root = root;

    this.reset();

    let layout = new Springy.Layout.ForceDirected(
      root.graph,
      100.0, // Spring stiffness
      100.0, // Node repulsion
      0.5, // Damping
      0.1 // Minimum
    );

    const self = this;
    this.renderer = new Springy.Renderer(
      layout,
      () => {
        // console.log('clear');
      },
      (edge, p1, p2) => {
        // console.log('drawEdge', edge, p1, p2);
      },
      (node, p) => {
        // console.log('drawNode', node, p);
        node.bounds = self.zero(node)
          .translate(new Vector(p).scale(150));
        if (!self.timer) {
          self.timer = setTimeout(() => {
            self.render(() => {
              self.timer = null;
            });
          }, 32);
        }
      }
    );

    if (this.autoStart) {
      if (callback) callback();
      return this.start();
    }

    this.render(callback);
  }

  reset(force) {
    const root = this.root;
    if (force) {
      root.node.bounds = null;
    }
    root.node.bounds = root.node.bounds || new Rectangle([1350, 1350, 1650, 1650]);

    let nodeList = root.dockerContainers.concat(root.otherNodes),
        length = nodeList.length,
        radius = (length * 1.5 / 10) * 250,//500,
        circle = new Circle(radius),
        steps = circle.getSteps(length),
        stepSize = new Rectangle().fromCenter(240, 80);//circle.getStepSize(length);

    nodeList.forEach((node, index) => {
      let step = steps[index];
      if (force) {
        node.bounds = null;
      }
      node.bounds = node.bounds ||
        // new Rectangle([1350, 1350, 1650, 1650]);
        new Rectangle()
          .fromCenter(stepSize.width, stepSize.height)
          .translate(step)
          .translate([1500, 1500]);
    });
  }

  render(callback) {
    const root = this.root;

    let graphNodes = [],
        graphLinks = [];

    graphNodes.push(<GCNode
      key={root.node.id}
      initialId={root.node.id}
      initialName={root.node.name}
      initialColor="#ff0"
      initialBounds={root.node.bounds}
      isRemovable={false}
      isChangable={false}
      css={{
        toolbar: {
          textAlign: 'center'
        },
        content: {
          textAlign: 'center',
          fontSize: '1.5em'
        },
        nameInput: {
          fontWeight: 'bold',
          color: '#ffc',
          width: '100%',
          textAlign: 'center'
        },
        wrapper: {
          borderRadius: 200,
          paddingBottom: 20,
          paddingLeft: 30,
          paddingRight: 20,
          paddingTop: 120
        }
      }}
      leftSockets={[
        <GCSocket
          key="localRackHDSocketLeft"
          dir={[-1, 0]}
          initialColor="#24f"
          initialId="localRackHDSocketLeft"
          initialName="Foo"
          hideLabel={true} />
      ]}
      rightSockets={[
        <GCSocket
          key="localRackHDSocketRight"
          dir={[1, 0]}
          initialColor="#4f2"
          initialId="localRackHDSocketRight"
          initialName="Foo"
          hideLabel={true} />
      ]}
    ><span style={{color: '#4f2'}}>{root.address}</span>&nbsp;</GCNode>);

    graphNodes = graphNodes.concat(
      root.dockerContainers.concat(root.otherNodes).map((node, index) => {
        const leftSockets = [],
              rightSockets = [],
              socketId = 'socket-' + node.id,
              linkId = 'link-' + node.id,
              color = node.isDockerContainer ? '#24f' : '#4f2',
              softColor = node.isDockerContainer ? '#48c' : '#6c8';
        if (node.bounds.max.x < 1500) {
          rightSockets.push(<GCSocket
            key={socketId}
            dir={[1, 0]}
            initialColor={color}
            initialId={socketId}
            initialName=""
            hideLabel={true} />);
        } else {
          leftSockets.push(<GCSocket
            key={socketId}
            dir={[-1, 0]}
            initialColor={color}
            initialId={socketId}
            initialName=""
            hideLabel={true}
          />);
        }

        if (node.isRackHDDockerContainer) {
          graphLinks.push(<GCLink
            key={linkId}
            from="localRackHDSocketLeft"
            to={socketId}
            initialId={linkId}
            initialColor={softColor}
            offsetToY={-80}
            offsetFromY={this.forceGraphStarted ? -300 : 0}
          />);
        } else {
          graphLinks.push(<GCLink
            key={linkId}
            from="localRackHDSocketRight"
            to={socketId}
            initialId={linkId}
            initialColor={softColor}
            offsetToY={-80}
            offsetFromY={this.forceGraphStarted ? -300 : 0}
          />);
        }

        if (node.relations && node.relations[0] && node.relations[0].relationType === 'encloses') {
          // console.log('GOT HERE', node.relations[0].targets);
          node.isEnclosure = true;
          node.relations[0].targets.forEach((target, i) => {
            const targetLinkId = 'link-' + node.id + '-' + i;
            graphLinks.push(<GCLink
              key={targetLinkId}
              from={'socket-' + node.id}
              to={'socket-' + target}
              initialId={targetLinkId}
              initialColor="#6c8"
              offsetToY={-80}
              offsetFromY={-80} />);
          });
        }

        // if (node.isDockerContainer) console.log(node);

        return (<GCNode
          key={node.id}
          initialId={node.id}
          initialName={node.name}
          initialColor={node.isEnclosure ? '#999' : color}
          initialBounds={node.bounds}
          isRemovable={false}
          isChangable={false}
          css={{
            toolbar: {
              textAlign: 'center'
            },
            content: {
              textAlign: 'center',
              fontSize: '1.1em'
            },
            nameInput: {
              width: '100%',
              textAlign: 'center',
              color: node.isDockerContainer ? '#cdf' : '#dfd'
            },
            wrapper: {
              borderRadius: 30,
              paddingBottom: 10,
              paddingLeft: 5,
              paddingRight: 5,
              paddingTop: 10
            }
          }}
          leftSockets={leftSockets}
          rightSockets={rightSockets}
        >
          <span style={{
            color: node.isDockerContainer && node.docker.container.State !== 'running' ? 'red' : color
          }}>
            {node.isDockerContainer ?
              node.docker.container.State :
              node.lookups && node.lookups.map(lookup => {
                return lookup.ipAddress || lookup.macAddress;
              })
            }
          </span>
          &nbsp;
        </GCNode>);
      })
    );

    const graphView = this.networkTopologyView.refs.splitView.refs.graph;
    graphView.setState({ graphLinks, graphNodes,
        version: graphView.state.version + 1 }, callback);
  }
}
