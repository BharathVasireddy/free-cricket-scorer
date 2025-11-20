import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Users, Plus, Edit2, Trash2, ArrowLeft } from 'lucide-react';
import { getUserRoster, savePlayerToRoster, updatePlayerInRoster, deletePlayerFromRoster } from '../lib/playerRosterService';
import type { SavedPlayer } from '../types';

const PlayerRosterPage: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    // Player roster state
    const [roster, setRoster] = useState<SavedPlayer[]>([]);
    const [isLoadingRoster, setIsLoadingRoster] = useState(true);
    const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
    const [isEditPlayerModalOpen, setIsEditPlayerModalOpen] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<SavedPlayer | null>(null);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [newPlayerPhone, setNewPlayerPhone] = useState('');
    const [newPlayerRole, setNewPlayerRole] = useState<'batsman' | 'bowler' | 'allrounder'>('allrounder');

    // Load roster on mount
    useEffect(() => {
        loadRoster();
    }, [currentUser]);

    const loadRoster = async () => {
        if (!currentUser) return;

        setIsLoadingRoster(true);
        try {
            const userRoster = await getUserRoster(currentUser.uid);
            setRoster(userRoster?.players || []);
        } catch (error) {        } finally {
            setIsLoadingRoster(false);
        }
    };

    const validatePhoneNumber = (phone: string): boolean => {
        if (!phone.trim()) return true; // Optional field
        const digitsOnly = phone.replace(/\D/g, '');
        return digitsOnly.length === 10;
    };

    const handleAddPlayer = async () => {
        if (!currentUser || !newPlayerName.trim()) return;

        if (!validatePhoneNumber(newPlayerPhone)) {
            alert('Phone number must be exactly 10 digits');
            return;
        }

        try {
            await savePlayerToRoster(currentUser.uid, {
                name: newPlayerName.toUpperCase(),
                phoneNumber: newPlayerPhone.replace(/\D/g, '') || undefined,
                role: newPlayerRole
            });
            setNewPlayerName('');
            setNewPlayerPhone('');
            setNewPlayerRole('allrounder');
            setIsAddPlayerModalOpen(false);
            await loadRoster();
        } catch (error) {            alert('Failed to add player. Please try again.');
        }
    };

    const handleEditPlayer = async () => {
        if (!currentUser || !editingPlayer || !newPlayerName.trim()) return;

        if (!validatePhoneNumber(newPlayerPhone)) {
            alert('Phone number must be exactly 10 digits');
            return;
        }

        try {
            await updatePlayerInRoster(currentUser.uid, editingPlayer.id, {
                name: newPlayerName.toUpperCase(),
                phoneNumber: newPlayerPhone.replace(/\D/g, '') || undefined,
                role: newPlayerRole
            });
            setEditingPlayer(null);
            setNewPlayerName('');
            setNewPlayerPhone('');
            setNewPlayerRole('allrounder');
            setIsEditPlayerModalOpen(false);
            await loadRoster();
        } catch (error) {            alert('Failed to update player. Please try again.');
        }
    };

    const handleDeletePlayer = async (playerId: string) => {
        if (!currentUser) return;

        if (!confirm('Are you sure you want to delete this player?')) return;

        try {
            await deletePlayerFromRoster(currentUser.uid, playerId);
            await loadRoster();
        } catch (error) {            alert('Failed to delete player. Please try again.');
        }
    };

    const openEditModal = (player: SavedPlayer) => {
        setEditingPlayer(player);
        setNewPlayerName(player.name);
        setNewPlayerPhone(player.phoneNumber || '');
        setNewPlayerRole(player.role || 'allrounder');
        setIsEditPlayerModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-safe">
            {/* Header */}
            <div className="bg-gradient-to-br from-cricket-blue to-blue-600 text-white px-4 py-6">
                <div className="max-w-lg mx-auto">
                    <button
                        onClick={() => navigate('/profile')}
                        className="flex items-center space-x-2 text-white/80 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span>Back to Profile</span>
                    </button>
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                            <Users size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Player Roster</h1>
                            <p className="text-blue-100 text-sm">Manage your saved players</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-lg mx-auto px-4 py-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                    {/* Header with Add Button */}
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h2 className="font-bold text-gray-900">Saved Players</h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {roster.length} {roster.length === 1 ? 'player' : 'players'}
                            </p>
                        </div>
                        <button
                            onClick={() => setIsAddPlayerModalOpen(true)}
                            className="flex items-center space-x-2 bg-cricket-blue text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            <Plus size={18} />
                            <span>Add Player</span>
                        </button>
                    </div>

                    {/* Player List */}
                    <div className="p-4">
                        {isLoadingRoster ? (
                            <div className="text-center py-12 text-gray-500">
                                <div className="w-10 h-10 border-3 border-cricket-blue border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                Loading roster...
                            </div>
                        ) : roster.length === 0 ? (
                            <div className="text-center py-12">
                                <Users size={64} className="mx-auto text-gray-300 mb-3" />
                                <h3 className="font-bold text-gray-900 mb-1">No players saved yet</h3>
                                <p className="text-gray-500 text-sm mb-4">
                                    Add players to quickly select them during match setup
                                </p>
                                <button
                                    onClick={() => setIsAddPlayerModalOpen(true)}
                                    className="inline-flex items-center space-x-2 bg-cricket-blue text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                                >
                                    <Plus size={18} />
                                    <span>Add Your First Player</span>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {roster.map((player) => (
                                    <div
                                        key={player.id}
                                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <div className="font-semibold text-gray-900 text-lg">{player.name}</div>
                                            {player.phoneNumber && (
                                                <div className="text-sm text-gray-600 mt-0.5">📱 {player.phoneNumber}</div>
                                            )}
                                            {player.role && (
                                                <div className="text-sm text-gray-500 capitalize mt-0.5">{player.role}</div>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => openEditModal(player)}
                                                className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Edit player"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeletePlayer(player.id)}
                                                className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete player"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Info Card */}
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">💡 Quick Tip</h3>
                    <p className="text-sm text-blue-700">
                        Players saved here will be available for quick selection when setting up a new match,
                        saving you time from typing names repeatedly.
                    </p>
                </div>
            </div>

            {/* Add Player Modal */}
            {isAddPlayerModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4">Add Player</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Player Name
                                </label>
                                <input
                                    type="text"
                                    value={newPlayerName}
                                    onChange={(e) => setNewPlayerName(e.target.value.toUpperCase())}
                                    className="input-field w-full"
                                    placeholder="PLAYER NAME"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Phone Number (Optional)
                                </label>
                                <input
                                    type="tel"
                                    value={newPlayerPhone}
                                    onChange={(e) => setNewPlayerPhone(e.target.value)}
                                    className="input-field w-full"
                                    placeholder="10-digit phone number"
                                    maxLength={10}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Role (Optional)
                                </label>
                                <select
                                    value={newPlayerRole}
                                    onChange={(e) => setNewPlayerRole(e.target.value as any)}
                                    className="input-field w-full"
                                >
                                    <option value="allrounder">All-rounder</option>
                                    <option value="batsman">Batsman</option>
                                    <option value="bowler">Bowler</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex space-x-3 mt-6">
                            <button
                                onClick={() => {
                                    setIsAddPlayerModalOpen(false);
                                    setNewPlayerName('');
                                    setNewPlayerPhone('');
                                    setNewPlayerRole('allrounder');
                                }}
                                className="flex-1 py-3 text-sm font-medium bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddPlayer}
                                disabled={!newPlayerName.trim()}
                                className="flex-1 py-3 text-sm font-medium bg-cricket-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Add Player
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Player Modal */}
            {isEditPlayerModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4">Edit Player</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Player Name
                                </label>
                                <input
                                    type="text"
                                    value={newPlayerName}
                                    onChange={(e) => setNewPlayerName(e.target.value.toUpperCase())}
                                    className="input-field w-full"
                                    placeholder="PLAYER NAME"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Phone Number (Optional)
                                </label>
                                <input
                                    type="tel"
                                    value={newPlayerPhone}
                                    onChange={(e) => setNewPlayerPhone(e.target.value)}
                                    className="input-field w-full"
                                    placeholder="10-digit phone number"
                                    maxLength={10}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Role (Optional)
                                </label>
                                <select
                                    value={newPlayerRole}
                                    onChange={(e) => setNewPlayerRole(e.target.value as any)}
                                    className="input-field w-full"
                                >
                                    <option value="allrounder">All-rounder</option>
                                    <option value="batsman">Batsman</option>
                                    <option value="bowler">Bowler</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex space-x-3 mt-6">
                            <button
                                onClick={() => {
                                    setIsEditPlayerModalOpen(false);
                                    setEditingPlayer(null);
                                    setNewPlayerName('');
                                    setNewPlayerPhone('');
                                    setNewPlayerRole('allrounder');
                                }}
                                className="flex-1 py-3 text-sm font-medium bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEditPlayer}
                                disabled={!newPlayerName.trim()}
                                className="flex-1 py-3 text-sm font-medium bg-cricket-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlayerRosterPage;
