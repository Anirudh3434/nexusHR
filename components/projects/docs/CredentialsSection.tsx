"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";
import CredentialCreationModal from "@/components/projects/docs/modals/CredentialCreationModal";
import { 
  Key, 
  Plus, 
  Star, 
  Search,
  Copy,
  Eye,
  EyeOff,
  Shield,
  AlertTriangle,
  Server,
  Globe,
  Database
} from "lucide-react";

interface CredentialsSectionProps {
  projectId: string;
  searchQuery: string;
}

interface Credential {
  _id: string;
  service: string;
  environment: string;
  category: string;
  loginUrl?: string;
  username?: string;
  email?: string;
  password?: string;
  apiKey?: string;
  secretKey?: string;
  accessToken?: string;
  tags: string[];
  isFavorite: boolean;
  expiryDate?: string;
  lastUsed?: string;
  createdBy: { name: string };
  updatedAt: string;
}

export default function CredentialsSection({ projectId, searchQuery }: CredentialsSectionProps) {
  const { addToast } = useToast();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  const environments = ['all', 'Local', 'Development', 'QA', 'UAT', 'Staging', 'Production'];
  const categories = ['all', 'Environment', 'Login', 'Infrastructure', 'API', 'Database', 'Cloud', 'ThirdParty', 'Other'];

  useEffect(() => {
    fetchCredentials();
  }, [projectId]);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/project-credentials?projectId=${projectId}`);
      const data = await response.json();
      setCredentials(data.credentials || []);
    } catch (error) {
      console.error('Error fetching credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCredentials = credentials.filter(cred => {
    const matchesSearch = cred.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cred.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cred.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (cred.tags && cred.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesEnvironment = selectedEnvironment === 'all' || cred.environment === selectedEnvironment;
    const matchesCategory = selectedCategory === 'all' || cred.category === selectedCategory;
    const matchesFavorites = !showFavoritesOnly || cred.isFavorite;
    return matchesSearch && matchesEnvironment && matchesCategory && matchesFavorites;
  });

  const getEnvironmentColor = (environment: string) => {
    const colors: Record<string, string> = {
      'Local': 'bg-slate-100 text-slate-700',
      'Development': 'bg-blue-100 text-blue-700',
      'QA': 'bg-purple-100 text-purple-700',
      'UAT': 'bg-orange-100 text-orange-700',
      'Staging': 'bg-amber-100 text-amber-700',
      'Production': 'bg-red-100 text-red-700'
    };
    return colors[environment] || 'bg-slate-100 text-slate-700';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Environment': return Globe;
      case 'Login': return Shield;
      case 'Infrastructure': return Server;
      case 'Database': return Database;
      default: return Key;
    }
  };

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const togglePasswordVisibility = (credentialId: string) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [credentialId]: !prev[credentialId]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">Loading credentials...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={selectedEnvironment}
            onChange={(e) => setSelectedEnvironment(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
          >
            {environments.map(env => (
              <option key={env} value={env}>{env === 'all' ? 'All Environments' : env}</option>
            ))}
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
            ))}
          </select>
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
              showFavoritesOnly 
                ? 'bg-amber-100 text-amber-700 border border-amber-300' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-amber-500' : ''}`} />
            Favorites
          </button>
        </div>
        <Button onClick={() => setShowCredentialModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Credential
        </Button>
      </div>

      {/* Credentials Grid */}
      {filteredCredentials.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Key className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No credentials found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCredentials.map((cred) => {
            const CategoryIcon = getCategoryIcon(cred.category);
            const isRevealed = revealedPasswords[cred._id];
            return (
              <Card key={cred._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CategoryIcon className="w-4 h-4 text-slate-500" />
                        <h3 className="font-semibold text-slate-900">{cred.service}</h3>
                        {isExpiringSoon(cred.expiryDate) && (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEnvironmentColor(cred.environment)}`}>
                          {cred.environment}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          {cred.category}
                        </span>
                      </div>
                    </div>
                    <button className="text-slate-400 hover:text-amber-500 transition-colors">
                      <Star className={`w-4 h-4 ${cred.isFavorite ? 'fill-amber-500 text-amber-500' : ''}`} />
                    </button>
                  </div>

                  {cred.loginUrl && (
                    <div className="mb-2">
                      <a 
                        href={cred.loginUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 hover:underline line-clamp-1"
                      >
                        {cred.loginUrl}
                      </a>
                    </div>
                  )}

                  <div className="space-y-2 mb-3">
                    {cred.username && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Username:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-900">{cred.username}</span>
                          <button 
                            onClick={() => copyToClipboard(cred.username!)}
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                    {cred.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Email:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-900 line-clamp-1">{cred.email}</span>
                          <button 
                            onClick={() => copyToClipboard(cred.email!)}
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                    {cred.password && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Password:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-900">
                            {isRevealed ? cred.password : '••••••••'}
                          </span>
                          <button 
                            onClick={() => togglePasswordVisibility(cred._id)}
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <button 
                            onClick={() => cred.password && copyToClipboard(cred.password)}
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                    {cred.apiKey && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">API Key:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-900 line-clamp-1">
                            {isRevealed ? cred.apiKey : '••••••••'}
                          </span>
                          <button 
                            onClick={() => cred.apiKey && copyToClipboard(cred.apiKey)}
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {cred.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                    <span>Updated {new Date(cred.updatedAt).toLocaleDateString()}</span>
                    {cred.expiryDate && (
                      <span className={isExpiringSoon(cred.expiryDate) ? 'text-amber-600 font-medium' : ''}>
                        Expires {new Date(cred.expiryDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CredentialCreationModal
        projectId={projectId}
        isOpen={showCredentialModal}
        onClose={() => setShowCredentialModal(false)}
        onSuccess={fetchCredentials}
      />
    </div>
  );
}
