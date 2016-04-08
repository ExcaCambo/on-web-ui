// Copyright 2015, EMC, Inc.

'use strict';

import React, { Component, PropTypes } from 'react';
import { Link } from 'react-router';

import {
    FlatButton,
    FontIcon,
    IconButton,
    Popover,
    RaisedButton,
    TextField
  } from 'material-ui';

import AppContainer from 'rui-common/views/AppContainer';
import emcTheme from 'rui-common/lib/emcTheme';
import FormatHelpers from 'rui-common/mixins/FormatHelpers';
import SplitView from 'rui-common/views/SplitView';

import RackHDRestAPIv2_0 from 'rui-common/messengers/RackHDRestAPIv2_0';
import RackHDRestAPIv1_1 from 'rui-common/messengers/RackHDRestAPIv1_1';

import MonoRailToolbar from './MonoRailToolbar';
import Logs from './Logs';
import icons from '../icons';

export default class MonoRailApp extends Component {

  static defaultProps = {
    collapsedHeaderHeight: 30,
    collapsedToolbarWidth: 55,
    expandedToolbarWidth: 300,
    toolbarSleepDuration: 1000
  };

  static contextTypes = {
    muiTheme: PropTypes.any,
    router: PropTypes.any
  };

  static childContextTypes = {
    app: PropTypes.any,
    icons: PropTypes.any,
    muiTheme: PropTypes.any,
    routes: PropTypes.any
  };

  getChildContext() {
    return {
      app: this,
      icons,
      muiTheme: emcTheme,
      routes: this.props.routes
    };
  }

  componentWillMount() {
    let route = this.props.routes[1];
    if (!route || route.name !== 'Settings') {
      let settingsRedirect = err => {
        this.context.router.push('/settings/help');
      };

      RackHDRestAPIv2_0.catch(settingsRedirect).then(() => {
        RackHDRestAPIv1_1.config.get().catch(settingsRedirect);
      });
    }
  }

  toolbarTimer = null;

  deferedExpandToolbar = () => {
    if (this.state.isToolbarExpanded) return;
    clearTimeout(this.toolbarTimer);
    this.toolbarTimer = setTimeout(this.expandToolbar, this.props.toolbarSleepDuration);
  }

  deferedCollapseToolbar = () => {
    if (this.state.isToolbarExpanded) return;
    clearTimeout(this.toolbarTimer);
    this.toolbarTimer = setTimeout(this.collapseToolbar, this.props.toolbarSleepDuration * 0.5);
  }

  toggleToolbar = (event) => {
    clearTimeout(this.toolbarTimer);
    if (this.state.isToolbarExpanded) {
      this.collapseToolbar(event, true);
    }
    else {
      this.expandToolbar(event);
    }
  };

  expandToolbar = (event) => {
    this.setState({
      toolbarWidth: this.props.expandedToolbarWidth,
      isToolbarExpanded: event ? true : this.state.isToolbarExpanded
    });
  };

  collapseToolbar = (event, wait) => {
    this.setState({
      toolbarWidth: wait ? this.state.toolbarWidth : this.props.collapsedToolbarWidth,
      isToolbarExpanded: event ? false : this.state.isToolbarExpanded
    });
  };

  state = {
    isToolbarExpanded: false,
    showLogs: false,
    toolbarWidth: this.props.collapsedToolbarWidth,
    headerHeight: this.props.collapsedHeaderHeight
  };

  render() {
    let renderToolbar = ({ width, height }) => {
      return (
        <MonoRailToolbar key="toolbar"
          width={width}
          height={height}
          style={{zIndex: 999, top: 0, left: 0}}
          collapsedToolbarWidth={this.props.collapsedToolbarWidth}
          onMenuToggle={this.toggleToolbar.bind(this)}
          onMouseEnter={this.deferedExpandToolbar.bind(this)}
          onMouseLeave={this.deferedCollapseToolbar.bind(this)} />
      );
    };

    let renderContent = ({ width, height }) => {
      let renderHeader = ({ height }) => {
        return (
          <div key="header" style={{width: width, height: height, overflow: 'hidden', transition: 'width 1s, height 1s'}}>
            <a style={{float: 'right', padding: 5}} onClick={this.toggleLogs.bind(this)}>
              {this.state.showLogs ? 'Hide' : 'Show'} RackHD Logs
            </a>
            <div style={{padding: 5, textAlign: 'center'}}>
              {this.renderBreadcrumbs()}
            </div>
            <Logs height={height - 60} open={this.state.showLogs} style={{clear: 'both', margin: 5}}/>
          </div>
        );
      };

      let renderBody = ({ height }) => {
        return (
          <div key="body" style={{width: width, height: height, overflow: 'hidden', transition: 'width 1s'}}>
            {this.props.children}
          </div>
        );
      };

      return (
        <SplitView key="content" ref="contentSplit"
          orientation="vertical"
          width={width}
          height={height}
          css={{
            root: {transition: 'width 1s'},
            a: {transition: 'width 1s, height 1s'},
            b: {transition: 'width 1s, height 1s, left 1s'},
            resize: {transition: 'width 1s, height 1s, left 1s, top 1s'}
          }}
          ratio={false}
          split={this.state.headerHeight}
          onUpdate={splitView => this.setState({headerHeight: splitView.state.split})}
          dividerSize={this.state.showLogs ? 10 : 5}
          resizable={this.state.showLogs}
          collapsable={false}
          a={renderHeader}
          b={renderBody} />
      );
    };

    return (
      <AppContainer key="app">
        <SplitView key="main" ref="mainSplit"
            orientation="horizontal"
            width="inherit"
            height="inherit"
            css={{
              a: {transition: 'width 1s'},
              b: {transition: 'width 1s, left 1s'},
              resize: {transition: 'left 1s'}
            }}
            ratio={false}
            split={this.state.toolbarWidth}
            dividerSize={5}
            resizable={false}
            collapsable={false}
            a={renderToolbar}
            b={renderContent} />
      </AppContainer>
    );
  }

  toggleLogs() {
    let showLogs = !this.state.showLogs;
    this.setState({
      showLogs,
      headerHeight: showLogs ?
        Math.max(300, this.state.headerHeight) :
        Math.min(this.props.collapsedHeaderHeight, this.state.headerHeight)
    });
  }

  renderBreadcrumbs() {
    if (!this.props.routes) return null;

    let breadcrumbs = [],
        title = '',
        depth = this.props.routes.length;

    add('/', 'RackHD', -1);
    divide();

    this.props.routes.forEach((item, index) => {
      if (index === 0) return;

      let path = (item.path || '').split('/');

      let showLastParam = path[path.length - 1].charAt(0) === ':',
          isNotLast = (index + 1) < depth;

      path = path.map(segment => {
        if (segment.charAt(0) === ':') {
          return this.props.params[segment.slice(1)];
        }
        return segment;
      });

      let targetPath = path.slice(0);
      if (showLastParam) targetPath.pop();
      add(targetPath.join('/'), item.name || item.component.name, index);

      if (isNotLast || showLastParam) { divide(index + 1); }
      if (showLastParam) {
        add(path.join('/'), last(path[path.length - 1]), index + 2);
      }
    });

    function add(target, name, index) {
      title += name;
      breadcrumbs.push(
        <Link key={'l' + index} to={target} style={{textDecoration: 'none'}}>
          {name}
        </Link>
      );
    }

    function divide(index) {
      title += ' » ';
      breadcrumbs.push(<span key={'s' + index}>&nbsp;{'»'}&nbsp;</span>);
    }

    function last(name) {
      if ((name.length === 24 || name.length === 36) && !((/\s/).test(name))) {
        name = FormatHelpers.shortId(name);
      }
      return name;
    }

    this.title = title;

    return breadcrumbs;
  }

  get title() {
    return this.findTitle().innerHTML;
  }

  set title(title) {
    this.findTitle().innerHTML = title;
  }

  findTitle() {
    return document.head.querySelector('title');
  }

}
