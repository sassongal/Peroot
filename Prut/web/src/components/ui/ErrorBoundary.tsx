"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name || 'Global'}] uncaught error:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-8 rounded-3xl border border-red-500/10 bg-red-500/5 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-500/10 text-red-500">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">משהו השתבש בתצוגה</h3>
            <p className="text-sm text-zinc-500">נתקלנו בשגיאה בטעינת הרכיב הזה.</p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="flex items-center gap-2 px-6 py-2 bg-white text-black rounded-xl text-xs font-bold mx-auto hover:bg-zinc-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            נסה שוב
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
