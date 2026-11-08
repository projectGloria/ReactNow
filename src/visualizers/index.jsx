// src/visualizers/index.jsx — lazy-loaded as one chunk by FieldJournal.
// To add an apparatus: create the component, register it here, and set
// `visualizer: 'Name'` on the lesson.
import SnapshotInspector from './SnapshotInspector.jsx'
import RenderCommitTimeline from './RenderCommitTimeline.jsx'
import BatchingQueue from './BatchingQueue.jsx'
import ReconciliationTree from './ReconciliationTree.jsx'
import EventLoop from './EventLoop.jsx'

const REGISTRY = { SnapshotInspector, RenderCommitTimeline, BatchingQueue, ReconciliationTree, EventLoop }

export default function Apparatus({ name }) {
  const Viz = REGISTRY[name]
  if (!Viz) return <p className="muted">The apparatus “{name}” has not been built yet.</p>
  return (
    <div className="apparatus">
      <div className="pane-label">Apparatus · {name.replace(/([a-z])([A-Z])/g, '$1 $2')}</div>
      <Viz />
    </div>
  )
}
