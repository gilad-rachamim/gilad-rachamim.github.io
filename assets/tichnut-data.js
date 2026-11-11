// נתוני כרטיסי NVIDIA ויכולות CUDA – משותף לכלי התכנות (VRAM, Occupancy, השוואה).
// המספרים מהמפרטים הרשמיים של NVIDIA. רוחב פס ב-GB/s, הספק בוואט.
(function () {
  // [שם, ארכיטקטורה, משפחה, שנה, Compute Capability, VRAM GB, רוחב פס GB/s, הספק W]
  var G = [
    ['GTX 1080 Ti', 'Pascal', 'geforce', 2017, '6.1', 11, 484, 250],
    ['RTX 2080 Ti', 'Turing', 'geforce', 2018, '7.5', 11, 616, 250],
    ['RTX 3060', 'Ampere', 'geforce', 2021, '8.6', 12, 360, 170],
    ['RTX 3080', 'Ampere', 'geforce', 2020, '8.6', 10, 760, 320],
    ['RTX 3090', 'Ampere', 'geforce', 2020, '8.6', 24, 936, 350],
    ['RTX 4060', 'Ada Lovelace', 'geforce', 2023, '8.9', 8, 272, 115],
    ['RTX 4060 Ti 16GB', 'Ada Lovelace', 'geforce', 2023, '8.9', 16, 288, 165],
    ['RTX 4070', 'Ada Lovelace', 'geforce', 2023, '8.9', 12, 504, 200],
    ['RTX 4070 Ti Super', 'Ada Lovelace', 'geforce', 2024, '8.9', 16, 672, 285],
    ['RTX 4080', 'Ada Lovelace', 'geforce', 2022, '8.9', 16, 717, 320],
    ['RTX 4090', 'Ada Lovelace', 'geforce', 2022, '8.9', 24, 1008, 450],
    ['RTX 5060 Ti 16GB', 'Blackwell', 'geforce', 2025, '12.0', 16, 448, 180],
    ['RTX 5070', 'Blackwell', 'geforce', 2025, '12.0', 12, 672, 250],
    ['RTX 5070 Ti', 'Blackwell', 'geforce', 2025, '12.0', 16, 896, 300],
    ['RTX 5080', 'Blackwell', 'geforce', 2025, '12.0', 16, 960, 360],
    ['RTX 5090', 'Blackwell', 'geforce', 2025, '12.0', 32, 1792, 575],
    ['RTX A6000', 'Ampere', 'pro', 2020, '8.6', 48, 768, 300],
    ['RTX 6000 Ada', 'Ada Lovelace', 'pro', 2022, '8.9', 48, 960, 300],
    ['Jetson AGX Orin 64GB', 'Ampere', 'edge', 2022, '8.7', 64, 205, 60],
    ['Tesla T4', 'Turing', 'dc', 2018, '7.5', 16, 320, 70],
    ['V100 32GB', 'Volta', 'dc', 2018, '7.0', 32, 900, 300],
    ['A10', 'Ampere', 'dc', 2021, '8.6', 24, 600, 150],
    ['L4', 'Ada Lovelace', 'dc', 2023, '8.9', 24, 300, 72],
    ['L40S', 'Ada Lovelace', 'dc', 2023, '8.9', 48, 864, 350],
    ['A100 40GB', 'Ampere', 'dc', 2020, '8.0', 40, 1555, 400],
    ['A100 80GB', 'Ampere', 'dc', 2021, '8.0', 80, 2039, 400],
    ['H100 PCIe', 'Hopper', 'dc', 2022, '9.0', 80, 2000, 350],
    ['H100 SXM', 'Hopper', 'dc', 2022, '9.0', 80, 3350, 700],
    ['H200', 'Hopper', 'dc', 2024, '9.0', 141, 4800, 700],
    ['B200', 'Blackwell', 'dc', 2025, '10.0', 192, 8000, 1000]
  ];
  // יכולות לכל Compute Capability: warps/SM, blocks/SM, shared KB/SM, shared KB לבלוק, האם יש 1KB שמור לבלוק
  var CC = {
    '6.1': { name: 'Pascal (GTX 10)', warps: 64, blocks: 32, smem: 96, smemBlock: 48, resv: 0 },
    '7.0': { name: 'Volta (V100)', warps: 64, blocks: 32, smem: 96, smemBlock: 96, resv: 0 },
    '7.5': { name: 'Turing (RTX 20, T4)', warps: 32, blocks: 16, smem: 64, smemBlock: 64, resv: 0 },
    '8.0': { name: 'Ampere (A100)', warps: 64, blocks: 32, smem: 164, smemBlock: 163, resv: 1 },
    '8.6': { name: 'Ampere (RTX 30, A10, A6000)', warps: 48, blocks: 16, smem: 100, smemBlock: 99, resv: 1 },
    '8.7': { name: 'Ampere (Jetson Orin)', warps: 48, blocks: 16, smem: 164, smemBlock: 163, resv: 1 },
    '8.9': { name: 'Ada (RTX 40, L4, L40S)', warps: 48, blocks: 24, smem: 100, smemBlock: 99, resv: 1 },
    '9.0': { name: 'Hopper (H100, H200)', warps: 64, blocks: 32, smem: 228, smemBlock: 227, resv: 1 },
    '10.0': { name: 'Blackwell (B200)', warps: 64, blocks: 32, smem: 228, smemBlock: 227, resv: 1 },
    '12.0': { name: 'Blackwell (RTX 50)', warps: 48, blocks: 32, smem: 128, smemBlock: 99, resv: 1 }
  };
  window.TICHNUT = {
    gpus: G.map(function (g) { return { name: g[0], arch: g[1], fam: g[2], year: g[3], cc: g[4], vram: g[5], bw: g[6], w: g[7] }; }),
    cc: CC,
    fam: { geforce: 'GeForce (בית/גיימינג)', pro: 'תחנת עבודה', dc: 'שרת / ענן', edge: 'Jetson (קצה)' },
    load: function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    save: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    used: function (t, how) { if (window.toolUsed) window.toolUsed(t, { how: how }); },
    wa: function (a, text) { a.href = 'https://wa.me/?text=' + encodeURIComponent(text); }
  };
})();
