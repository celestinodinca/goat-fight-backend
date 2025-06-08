// Backend Node.js pentru GOAT Fight – cu referral tracking

const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

// Adresa unică EGLD
const VOTE_ADDRESS = 'erd1n0kqf488m6skjazhsmfnpakhvxgtav0jjgmck4j3a2qf7mhsf45q9gz55c';

// Bază de date simplă în memorie pentru referral tracking
let referrals = {}; // { referrerAddress: [list of referred voters] }

const toEGLD = (value) => parseFloat(value) / 1e18;

app.get('/api/scores', async (req, res) => {
  try {
    const url = `https://api.multiversx.com/accounts/${VOTE_ADDRESS}/transactions?size=1000`;
    const response = await fetch(url);
    const txs = await response.json();

    let messi = 0, ronaldo = 0;
    let leaderboard = {};

    // Reset referrals each time (in-memory demo)
    referrals = {};

    for (const tx of txs) {
      if (tx.receiver !== VOTE_ADDRESS) continue;
      if (!tx.data) continue;

      const data = Buffer.from(tx.data, 'base64').toString('utf-8');
      const lowerData = data.toLowerCase();
      const amount = toEGLD(tx.value);

      let voteFor = null;
      if (lowerData.includes('messi')) voteFor = 'messi';
      else if (lowerData.includes('ronaldo')) voteFor = 'ronaldo';
      if (!voteFor) continue;

      // Tally votes
      if (voteFor === 'messi') messi += amount;
      if (voteFor === 'ronaldo') ronaldo += amount;

      leaderboard[tx.sender] = leaderboard[tx.sender] || { messi: 0, ronaldo: 0 };
      leaderboard[tx.sender][voteFor] += amount;

      // Track referrals if ref is present (ex: messi_ref_erd1...)
      const match = data.match(/ref_(erd1[0-9a-z]{58})/);
      if (match) {
        const ref = match[1];
        if (!referrals[ref]) referrals[ref] = new Set();
        referrals[ref].add(tx.sender);
      }
    }

    const boardFormatted = Object.entries(leaderboard).map(([addr, votes]) => {
      return `${addr.slice(0,6)}...${addr.slice(-4)} → Messi: ${votes.messi?.toFixed(2) || 0} EGLD | Ronaldo: ${votes.ronaldo?.toFixed(2) || 0} EGLD`;
    }).slice(0, 10).join('\n');

    const referralStats = Object.entries(referrals).map(([ref, set]) => {
      return `${ref.slice(0,6)}...${ref.slice(-4)} → a adus ${set.size} votant(i)`;
    }).join('\n');

    res.json({
      messi: messi.toFixed(2),
      ronaldo: ronaldo.toFixed(2),
      leaderboard: boardFormatted,
      referrals: referralStats
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Eroare la procesare scoruri' });
  }
});

app.listen(PORT, () => console.log(`GOAT backend rulează pe http://localhost:${PORT}`));
