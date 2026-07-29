import { Component } from 'react';

// Isolates a subtree so one broken piece (e.g. a query against a Convex
// function that hasn't been deployed yet) can't blank out the rest of the
// Pro app shell — most usefully the nav bar, which must stay usable.
export default class ProErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Pro app error:', error, info);
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}
