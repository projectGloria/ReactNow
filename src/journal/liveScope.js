// src/journal/liveScope.js
// Shared by the live editor and the trial harness so a snippet behaves the
// same in both. MODULE-LEVEL CONSTANTS on purpose: react-live re-runs its
// transpile effect whenever `scope` or `transformCode` change identity, so an
// inline object literal would re-evaluate your code on every parent render.
import * as React from 'react'

export const SCOPE = {
  React,
  useState: React.useState,
  useEffect: React.useEffect,
  useLayoutEffect: React.useLayoutEffect,
  useRef: React.useRef,
  useMemo: React.useMemo,
  useCallback: React.useCallback,
  useReducer: React.useReducer,
  useContext: React.useContext,
  createContext: React.createContext,
  useId: React.useId,
  useTransition: React.useTransition,
  useDeferredValue: React.useDeferredValue,
  useSyncExternalStore: React.useSyncExternalStore,
  useOptimistic: React.useOptimistic,
  useActionState: React.useActionState,
  use: React.use,
  memo: React.memo,
  Fragment: React.Fragment,
  Suspense: React.Suspense,
}

/** Every snippet defines `function App`; we append the render call. */
export const appendRender = (code) => `${code}\n\nrender(<App />)`

/** Parchment syntax theme for prism-react-renderer. */
export const PARCHMENT_THEME = {
  plain: { color: '#2b2118', backgroundColor: 'transparent' },
  styles: [
    { types: ['comment', 'prolog', 'doctype', 'cdata'], style: { color: '#8a7358', fontStyle: 'italic' } },
    { types: ['keyword', 'boolean', 'null', 'undefined'], style: { color: '#7d1f1a' } },
    { types: ['string', 'char', 'attr-value', 'template-string'], style: { color: '#3f6b5c' } },
    { types: ['number'], style: { color: '#8a6a1c' } },
    { types: ['function', 'maybe-class-name', 'class-name'], style: { color: '#5a3a14', fontWeight: 600 } },
    { types: ['tag'], style: { color: '#7d1f1a' } },
    { types: ['attr-name'], style: { color: '#6b5230', fontStyle: 'italic' } },
    { types: ['punctuation', 'operator'], style: { color: '#6f5b45' } },
  ],
}
