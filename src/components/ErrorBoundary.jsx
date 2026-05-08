import { Component } from 'react';
import PropTypes from 'prop-types';
import { classNames } from '@/utils/helpers';

/**
 * @typedef {Object} ErrorBoundaryState
 * @property {boolean} hasError - Whether an error has been caught
 * @property {Error|null} error - The caught error object
 * @property {string|null} errorInfo - Component stack trace information
 */

/**
 * ErrorBoundary component that catches rendering errors in child components
 * and displays a user-friendly fallback UI with a retry option.
 * Uses a class component as required by React's error boundary API.
 *
 * Logs error details to the console and provides a 'Try Again' button
 * that resets the error state and re-renders the children.
 */
class ErrorBoundary extends Component {
  /**
   * @param {Object} props
   * @param {React.ReactNode} props.children - Child components to render
   * @param {React.ReactNode} [props.fallback] - Optional custom fallback UI
   * @param {Function} [props.onError] - Optional callback invoked when an error is caught
   * @param {string} [props.className] - Additional CSS class names for the fallback container
   */
  constructor(props) {
    super(props);

    /** @type {ErrorBoundaryState} */
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };

    this.handleReset = this.handleReset.bind(this);
    this.handleResetKeyDown = this.handleResetKeyDown.bind(this);
  }

  /**
   * Derives error state from a caught error.
   * @param {Error} error - The caught error
   * @returns {Partial<ErrorBoundaryState>} Updated state
   */
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Logs error details and invokes the optional onError callback.
   * @param {Error} error - The caught error
   * @param {Object} errorInfo - React error info with componentStack
   */
  componentDidCatch(error, errorInfo) {
    const componentStack = errorInfo && errorInfo.componentStack
      ? errorInfo.componentStack
      : null;

    this.setState({
      errorInfo: componentStack,
    });

    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error('ErrorBoundary caught an error:', error);
      if (componentStack) {
        console.error('Component stack:', componentStack);
      }
    }

    if (typeof this.props.onError === 'function') {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Resets the error state to allow re-rendering of children.
   */
  handleReset() {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  }

  /**
   * Handles keyboard interaction on the reset button.
   * @param {React.KeyboardEvent} event - The keyboard event
   */
  handleResetKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleReset();
    }
  }

  render() {
    const { hasError, error } = this.state;
    const { children, fallback, className } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      const containerClasses = classNames(
        'flex min-h-[200px] flex-col items-center justify-center rounded border border-gray-200 bg-white p-8 text-center shadow-sm',
        className
      );

      return (
        <div
          role="alert"
          aria-label="Application error"
          aria-live="assertive"
          aria-atomic="true"
          className={containerClasses}
        >
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-red-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="mb-2 text-lg font-medium text-body">
            Something went wrong
          </h2>
          <p className="mb-6 max-w-md text-sm text-gray-600">
            An unexpected error occurred. Please try again. If the problem persists, contact customer support.
          </p>
          {error && error.message && (
            <p className="mb-4 max-w-md text-xs text-gray-400">
              Error: {error.message}
            </p>
          )}
          <button
            type="button"
            onClick={this.handleReset}
            onKeyDown={this.handleResetKeyDown}
            aria-label="Try again"
            className="button-primary"
          >
            Try Again
          </button>
        </div>
      );
    }

    return children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
  onError: PropTypes.func,
  className: PropTypes.string,
};

export default ErrorBoundary;