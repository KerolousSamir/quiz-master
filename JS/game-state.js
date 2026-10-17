"use strict";

const GameState = {
  // مصفوفة تبدأ فارغة تماماً وتستقبل فقط المنضمين الجدد
  livePlayers: [],

  init() {
    // قراءة اللاعبين الذين سجلوا دخولهم بالفعل عبر صفحة participant.html أو اللوبي
    const stored = JSON.parse(localStorage.getItem("churchQuizPlayers") || "[]");
    this.livePlayers = stored.map(p => ({
      name: p.fullName || p.name,
      avatar: p.avatar || "👤",
      score: 0,
      streak: 0,
      lastAdded: 0
    }));
  },

  addPlayer(player) {
    if (!player || !player.fullName) return;
    const exists = this.livePlayers.some(p => p.name === player.fullName);
    if (!exists) {
      this.livePlayers.push({
        name: player.fullName,
        avatar: player.avatar || "👤",
        score: 0,
        streak: 0,
        lastAdded: 0
      });
      localStorage.setItem("churchQuizPlayers", JSON.stringify(this.livePlayers));
    }
  },

  recordAnswer(playerName, choiceIndex, correctIndex) {
    const player = this.livePlayers.find(p => p.name === playerName);
    if (!player) return;

    if (Number(choiceIndex) === Number(correctIndex)) {
      player.streak += 1;
      const streakBonus = Math.min(player.streak * 50, 300);
      const added = 1000 + streakBonus;
      player.score += added;
      player.lastAdded = added;
    } else {
      player.streak = 0;
      player.lastAdded = 0;
    }
  },

  getTopPlayers(count = 5) {
    return [...this.livePlayers]
      .sort((a, b) => b.score - a.score)
      .slice(0, count);
  },

  saveFinalStandings() {
    const sorted = [...this.livePlayers].sort((a, b) => b.score - a.score);
    localStorage.setItem("churchQuizFinalStandings", JSON.stringify(sorted));
  }
};