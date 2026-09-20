import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Trash2, AtSign, Clock, User } from 'lucide-react';
import { getComments, addComment, deleteComment } from '../../api';
import { timeAgo } from '../../utils';

export default function ContextualComments({
  contextType,
  contextId,
  projectId = null,
  currentUser,
  teamUsers = []
}) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionMenu, setShowMentionMenu] = useState(false);

  useEffect(() => {
    if (contextType && contextId) {
      loadComments();
    }
  }, [contextType, contextId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const res = await getComments({ contextType, contextId });
      if (res.data?.success) {
        setComments(res.data.comments || []);
      }
    } catch (err) {
      console.warn('Failed to load comments:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);

    // Simple mention detection
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && lastAt === val.length - 1) {
      setShowMentionMenu(true);
      setMentionQuery('');
    } else if (lastAt !== -1 && !val.slice(lastAt).includes(' ')) {
      setShowMentionMenu(true);
      setMentionQuery(val.slice(lastAt + 1).toLowerCase());
    } else {
      setShowMentionMenu(false);
    }
  };

  const handleSelectMention = (user) => {
    const lastAt = text.lastIndexOf('@');
    const newText = text.slice(0, lastAt) + `@${user.email || user.name} ` ;
    setText(newText);
    setShowMentionMenu(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await addComment({
        contextType,
        contextId,
        projectId,
        content: text.trim()
      });
      if (res.data?.success) {
        setText('');
        setShowMentionMenu(false);
        setComments(prev => [...prev, res.data.comment]);
      }
    } catch (err) {
      alert('Failed to post comment: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteComment(id);
      setComments(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert('Failed to delete comment: ' + (err.response?.data?.error || err.message));
    }
  };

  const filteredTeam = (teamUsers || []).filter(u =>
    (u.name && u.name.toLowerCase().includes(mentionQuery)) ||
    (u.email && u.email.toLowerCase().includes(mentionQuery))
  ).slice(0, 5);

  return (
    <div className="contextual-comments-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          <MessageSquare size={15} style={{ color: 'var(--teal)' }} />
          <span>Discussion & Mentions</span>
          <span style={{ fontSize: '11px', background: 'var(--bg-card)', padding: '2px 6px', borderRadius: '10px', color: 'var(--text-secondary)' }}>
            {comments.length}
          </span>
        </div>
      </div>

      {/* Comment List */}
      <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)', fontSize: '12px' }}>Loading comments...</div>
        ) : comments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)', fontSize: '12px' }}>
            No comments yet on this {contextType.toLowerCase()}. Type below to start the thread.
          </div>
        ) : (
          comments.map(c => {
            const isMe = c.userEmail === currentUser?.email || c.userName === currentUser?.name;
            const canDelete = isMe || ['admin', 'superadmin'].includes(currentUser?.role);

            // Highlight mentions
            const formattedContent = c.content.split(/(@[a-zA-Z0-9._-]+(?:@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)?)/g).map((part, i) => {
              if (part.startsWith('@')) {
                return <span key={i} style={{ color: 'var(--teal)', fontWeight: 600, background: 'rgba(0,176,255,0.1)', padding: '1px 4px', borderRadius: '4px' }}>{part}</span>;
              }
              return part;
            });

            return (
              <div key={c.id} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '22px', height: '22px', borderRadius: '50%',
                      background: 'var(--border-color)', color: 'var(--text-primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600
                    }}>
                      {(c.userName || c.userEmail || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{c.userName || c.userEmail}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock size={11} />
                      {timeAgo(c.createdAt)}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
                        title="Delete comment"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                  {formattedContent}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Mention helper popover */}
      {showMentionMenu && filteredTeam.length > 0 && (
        <div style={{
          background: 'var(--bg-elevated, #1e293b)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px 6px' }}>Tag team member:</div>
          {filteredTeam.map(u => (
            <div
              key={u.email}
              onClick={() => handleSelectMention(u)}
              style={{
                padding: '5px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                hover: { background: 'var(--bg-hover)' }
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span>{u.name || u.email}</span>
              <span style={{ fontSize: '10px', color: 'var(--teal)' }}>{u.role}</span>
            </div>
          ))}
        </div>
      )}

      {/* Input box */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', position: 'relative' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Write a comment... (type @ to mention a user)"
          value={text}
          onChange={handleTextChange}
          style={{ flex: 1, fontSize: '12px', padding: '8px 12px' }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!text.trim() || submitting}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 14px' }}
        >
          <Send size={13} />
          <span style={{ fontSize: '12px' }}>Post</span>
        </button>
      </form>
    </div>
  );
}
