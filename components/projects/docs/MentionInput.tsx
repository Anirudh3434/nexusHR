"use client";

import React, { useState, useRef, useEffect } from 'react';
import { User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  users?: Array<{ id: string; name: string; email: string }>;
  projectId: string;
}

export default function MentionInput({ 
  value, 
  onChange, 
  placeholder = 'Write your note here...', 
  rows = 4,
  users = [],
  projectId 
}: MentionInputProps) {
  const { user } = useAuth();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch project members when component mounts
  useEffect(() => {
    fetchProjectMembers();
  }, [projectId]);

  const [projectUsers, setProjectUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const fetchProjectMembers = async () => {
    try {
      setLoadingMembers(true);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (user?.id) headers['x-user-id'] = user.id;
      if (user?.role) headers['x-user-role'] = user.role;
      if (user?.companyId) headers['x-company-id'] = user.companyId;

      const response = await fetch(`/api/projects/${projectId}/members`, {
        headers
      });
      const data = await response.json();
      console.log('Project members response:', data);
      setProjectUsers(data.members || []);
    } catch (error) {
      console.error('Error fetching project members:', error);
      setProjectUsers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const filteredUsers = projectUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newCursorPosition = e.target.selectionStart;
    
    onChange(newValue);
    setCursorPosition(newCursorPosition);

    // Check if we're in a mention
    const textBeforeCursor = newValue.substring(0, newCursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      // Check if there's a space before the @ or it's at the start
      const charBeforeAt = textBeforeCursor[lastAtIndex - 1];
      const isValidMentionStart = lastAtIndex === 0 || /\s/.test(charBeforeAt);
      
      if (isValidMentionStart) {
        const mentionText = textBeforeCursor.substring(lastAtIndex + 1);
        if (!mentionText.includes(' ')) {
          setSearchTerm(mentionText);
          setMentionStart(lastAtIndex);
          setShowSuggestions(true);
          return;
        }
      }
    }

    setShowSuggestions(false);
    setMentionStart(-1);
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions) return;

    if (e.key === 'Escape') {
      setShowSuggestions(false);
      e.preventDefault();
    }
  };

  const selectUser = (user: { id: string; name: string; email: string }) => {
    const beforeMention = value.substring(0, mentionStart);
    const afterMention = value.substring(cursorPosition);
    const mentionText = `@${user.name}`;
    
    const newValue = beforeMention + mentionText + ' ' + afterMention;
    onChange(newValue);
    
    setShowSuggestions(false);
    setMentionStart(-1);
    setSearchTerm('');

    // Set cursor after the mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPosition = beforeMention.length + mentionText.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Highlight mentions in the content for display
  const renderHighlightedContent = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="bg-indigo-100 text-indigo-700 px-1 rounded font-medium">
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 resize-none"
      />
      
      {showSuggestions && filteredUsers.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {/* Show current user at top with "me" label */}
          {user && searchTerm === '' && (
            <button
              key="current-user"
              type="button"
              onClick={() => selectUser({ id: user.id, name: user.name, email: user.email })}
              className="w-full px-3 py-2 flex items-center gap-3 hover:bg-indigo-50 transition-colors text-left bg-indigo-50/50 border-b border-slate-100"
            >
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{user.name} <span className="text-indigo-600 font-normal">(me)</span></p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
            </button>
          )}
          {filteredUsers
            .filter(u => u.id !== user?.id || searchTerm !== '') // Exclude current user from list when search is empty
            .map((userItem) => (
              <button
                key={userItem.id}
                type="button"
                onClick={() => selectUser(userItem)}
                className="w-full px-3 py-2 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{userItem.name}</p>
                  <p className="text-xs text-slate-500">{userItem.email}</p>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
