import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Cell, BarChart, Bar, Legend, ReferenceLine, Area, AreaChart, ComposedChart } from "recharts";

// ============================================================
// ダミーデータ生成：博論第5章の翻訳の3類型を基盤とした仮説的分析
// ============================================================

// 6グループの探究学習セッション（各10セッション）の談話コード時系列
const GROUP_PROFILES = {
  G1: { label: "G1: 学際的再構成型", type: "reconfig", color: "#e63946", finalType: 3 },
  G2: { label: "G2: 学際的再構成型", type: "reconfig", color: "#d62828", finalType: 3 },
  G3: { label: "G3: 分野連携型", type: "bridging", color: "#457b9d", finalType: 2 },
  G4: { label: "G4: 分野連携型", type: "bridging", color: "#1d3557", finalType: 2 },
  G5: { label: "G5: 同一学問型", type: "mono", color: "#a8dadc", finalType: 1 },
  G6: { label: "G6: 同一学問型", type: "mono", color: "#94d2bd", finalType: 1 },
};

// 談話コードカテゴリ（境界横断×ANT枠組みに基づく）
const CODE_CATEGORIES = [
  "教科A内の推論",
  "教科B内の推論",
  "データの参照",
  "仮説との齟齬（抵抗）",
  "他分野の概念導入",
  "問いの再構成",
  "統合的な解釈",
];

// セッションごとのコード頻度分布（ダミーデータ）
function generateCodeDistributions(groupType, sessions = 10) {
  const data = [];
  for (let s = 1; s <= sessions; s++) {
    const t = s / sessions;
    let dist;
    if (groupType === "reconfig") {
      // 学際的再構成型：中盤で「抵抗」が急増し、後半で「統合的解釈」と「問いの再構成」が増加
      dist = [
        Math.max(0, 0.35 - 0.15 * t + Math.random() * 0.05),
        Math.max(0, 0.25 - 0.10 * t + Math.random() * 0.05),
        Math.max(0, 0.15 + 0.05 * t + Math.random() * 0.03),
        Math.max(0, 0.05 + 0.25 * Math.sin(Math.PI * t) + Math.random() * 0.03), // 抵抗のピーク
        Math.max(0, 0.02 + 0.15 * t + Math.random() * 0.03),
        Math.max(0, 0.01 + 0.18 * t * t + Math.random() * 0.02), // 問いの再構成
        Math.max(0, 0.02 + 0.20 * t * t + Math.random() * 0.02), // 統合的解釈
      ];
    } else if (groupType === "bridging") {
      // 分野連携型：抵抗は経験するが、問いの再構成には至らない
      dist = [
        Math.max(0, 0.30 - 0.05 * t + Math.random() * 0.05),
        Math.max(0, 0.25 - 0.05 * t + Math.random() * 0.05),
        Math.max(0, 0.15 + 0.03 * t + Math.random() * 0.03),
        Math.max(0, 0.05 + 0.15 * Math.sin(Math.PI * t) + Math.random() * 0.03), // 抵抗（弱め）
        Math.max(0, 0.05 + 0.10 * t + Math.random() * 0.03), // 他分野導入あり
        Math.max(0, 0.01 + 0.02 * t + Math.random() * 0.01), // 問いの再構成ほぼなし
        Math.max(0, 0.03 + 0.05 * t + Math.random() * 0.02), // 統合的解釈弱い
      ];
    } else {
      // 同一学問型：抵抗を回避し、単一教科内に留まる
      dist = [
        Math.max(0, 0.40 + 0.05 * t + Math.random() * 0.05),
        Math.max(0, 0.10 - 0.03 * t + Math.random() * 0.03),
        Math.max(0, 0.20 + Math.random() * 0.05),
        Math.max(0, 0.03 + 0.02 * Math.sin(Math.PI * t) + Math.random() * 0.02), // 抵抗ほぼなし
        Math.max(0, 0.01 + Math.random() * 0.02),
        Math.max(0, 0.005 + Math.random() * 0.01),
        Math.max(0, 0.01 + Math.random() * 0.01),
      ];
    }
    // 正規化
    const sum = dist.reduce((a, b) => a + b, 0);
    const normalized = dist.map((d) => Math.round((d / sum) * 100) / 100);
    data.push({ session: s, distribution: normalized });
  }
  return data;
}

// Wasserstein距離の簡易近似（1次元ヒストグラム間）
function wassersteinDistance(p, q) {
  let cumP = 0, cumQ = 0, dist = 0;
  for (let i = 0; i < p.length; i++) {
    cumP += p[i];
    cumQ += q[i];
    dist += Math.abs(cumP - cumQ);
  }
  return Math.round(dist * 1000) / 1000;
}

// Shannon エントロピー
function entropy(p) {
  let h = 0;
  for (const pi of p) {
    if (pi > 0) h -= pi * Math.log2(pi);
  }
  return Math.round(h * 1000) / 1000;
}

// KLダイバージェンス（P || Q）
function klDivergence(p, q) {
  let kl = 0;
  for (let i = 0; i < p.length; i++) {
    if (p[i] > 0.001 && q[i] > 0.001) {
      kl += p[i] * Math.log2(p[i] / q[i]);
    }
  }
  return Math.round(kl * 1000) / 1000;
}

// 全グループのデータ生成
const ALL_DATA = {};
Object.entries(GROUP_PROFILES).forEach(([key, profile]) => {
  ALL_DATA[key] = generateCodeDistributions(profile.type);
});

// ============================================================
// シナリオ1: 最適輸送理論による「統合の軌跡」の可視化
// WHY: 抵抗を経験したグループだけが分布空間を大きく移動する
// ============================================================
function buildTrajectoryData() {
  const result = [];
  Object.entries(ALL_DATA).forEach(([groupId, sessions]) => {
    const profile = GROUP_PROFILES[groupId];
    const initial = sessions[0].distribution;
    for (let i = 0; i < sessions.length; i++) {
      const wd = wassersteinDistance(initial, sessions[i].distribution);
      const ent = entropy(sessions[i].distribution);
      const resistance = sessions[i].distribution[3]; // 「抵抗」コードの割合
      result.push({
        group: profile.label,
        type: profile.type,
        color: profile.color,
        session: i + 1,
        cumulativeShift: wd,
        entropy: ent,
        resistance: Math.round(resistance * 100),
      });
    }
  });
  return result;
}

// ============================================================
// シナリオ2: エントロピーと統合の関係
// WHY: 「揺らぎ」（エントロピーの一時的増大）が統合の前提条件
// ============================================================
function buildEntropyResistanceData() {
  const result = [];
  Object.entries(ALL_DATA).forEach(([groupId, sessions]) => {
    const profile = GROUP_PROFILES[groupId];
    // 最大エントロピーと最終的な統合度（統合コードの割合）を計算
    let maxEntropy = 0;
    let maxResistance = 0;
    sessions.forEach((s) => {
      const e = entropy(s.distribution);
      if (e > maxEntropy) maxEntropy = e;
      if (s.distribution[3] > maxResistance) maxResistance = s.distribution[3];
    });
    const finalIntegration = sessions[sessions.length - 1].distribution[6]; // 統合的解釈
    result.push({
      group: profile.label,
      type: profile.type,
      color: profile.color,
      maxEntropy: Math.round(maxEntropy * 100) / 100,
      maxResistance: Math.round(maxResistance * 100),
      finalIntegration: Math.round(finalIntegration * 100),
    });
  });
  return result;
}

// ============================================================
// シナリオ3: 位相的構造変化（TDA的視点のダミー）
// WHY: 統合に至るグループだけが「新しいループ」を獲得する
// ============================================================
function buildTopologicalData() {
  const result = [];
  Object.entries(ALL_DATA).forEach(([groupId, sessions]) => {
    const profile = GROUP_PROFILES[groupId];
    for (let i = 0; i < sessions.length; i++) {
      const d = sessions[i].distribution;
      // 簡易的なトポロジカル特徴：異なるコードカテゴリ間の「接続度」
      // 閾値以上のコードが共存 = 接続あり
      const threshold = 0.08;
      const activeCategories = d.filter((v) => v >= threshold).length;
      // 「ループ」の近似: 3つ以上のカテゴリが同時にアクティブなら1ループ
      const loops = Math.max(0, activeCategories - 2);
      result.push({
        group: profile.label,
        type: profile.type,
        color: profile.color,
        session: i + 1,
        activeCategories,
        loops,
      });
    }
  });
  return result;
}

// ============================================================
// メインコンポーネント
// ============================================================
const SCENARIOS = [
  { id: "trajectory", label: "シナリオ1: 最適輸送理論", subtitle: "なぜ抵抗が統合を駆動するのか" },
  { id: "entropy", label: "シナリオ2: エントロピーと統合", subtitle: "なぜ揺らぎが統合の前提条件なのか" },
  { id: "topology", label: "シナリオ3: 位相的構造変化", subtitle: "なぜ新しい接続が創発するのか" },
  { id: "theory", label: "理論的統合", subtitle: "3つのwhyを貫く原理" },
];

const TYPE_LABELS = { reconfig: "学際的再構成型", bridging: "分野連携型", mono: "同一学問型" };
const TYPE_COLORS = { reconfig: "#e63946", bridging: "#457b9d", mono: "#a8dadc" };

export default function App() {
  const [activeScenario, setActiveScenario] = useState("trajectory");
  const trajectoryData = buildTrajectoryData();
  const entropyData = buildEntropyResistanceData();
  const topologyData = buildTopologicalData();

  return (
    <div style={{ fontFamily: "'Noto Sans JP', 'Helvetica Neue', sans-serif", background: "#0a0a0f", color: "#e8e6e3", minHeight: "100vh", padding: "0" }}>
      {/* Header */}
      <div style={{ padding: "40px 32px 24px", borderBottom: "1px solid #1a1a2e" }}>
        <div style={{ fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase", color: "#e63946", marginBottom: "12px" }}>
          Hypothetical Analysis with Dummy Data
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 300, margin: 0, lineHeight: 1.3, color: "#f1faee" }}>
          How → Why：データ記述科学は学際的統合の<span style={{ color: "#e63946", fontWeight: 600 }}>「なぜ」</span>に到達できるか
        </h1>
        <p style={{ fontSize: "13px", color: "#8d99ae", marginTop: "12px", maxWidth: "800px", lineHeight: 1.7 }}>
          博論第5章の翻訳の3類型（同一学問型・分野連携型・学際的再構成型）をダミーデータで再現し、
          GToP三軸（GDA・TDA・PDA）の各手法が「how（どう見えるか）」を超えて「why（なぜ起きるか）」に到達するシナリオを検証する。
        </p>
      </div>

      {/* Scenario Tabs */}
      <div style={{ display: "flex", gap: "0", borderBottom: "1px solid #1a1a2e", overflowX: "auto" }}>
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveScenario(s.id)}
            style={{
              flex: "1 1 0",
              padding: "16px 20px",
              background: activeScenario === s.id ? "#1a1a2e" : "transparent",
              border: "none",
              borderBottom: activeScenario === s.id ? "2px solid #e63946" : "2px solid transparent",
              color: activeScenario === s.id ? "#f1faee" : "#8d99ae",
              cursor: "pointer",
              fontSize: "12px",
              textAlign: "left",
              transition: "all 0.2s",
              minWidth: "180px",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "4px" }}>{s.label}</div>
            <div style={{ fontSize: "11px", opacity: 0.7 }}>{s.subtitle}</div>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "32px" }}>
        {activeScenario === "trajectory" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
              {/* Chart: Cumulative Distribution Shift */}
              <div style={{ background: "#12121a", borderRadius: "12px", padding: "24px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 4px", color: "#f1faee" }}>
                  分布空間における累積移動距離（Wasserstein距離）
                </h3>
                <p style={{ fontSize: "11px", color: "#8d99ae", margin: "0 0 20px" }}>
                  初期セッションからの談話パターン分布の累積変化量
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
                    <XAxis dataKey="session" type="number" domain={[1, 10]} stroke="#555" tick={{ fontSize: 11 }} label={{ value: "セッション", position: "bottom", fontSize: 11, fill: "#8d99ae" }} />
                    <YAxis stroke="#555" tick={{ fontSize: 11 }} label={{ value: "累積WD", angle: -90, position: "insideLeft", fontSize: 11, fill: "#8d99ae" }} />
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", fontSize: 11, color: "#e8e6e3" }} />
                    {Object.entries(GROUP_PROFILES).map(([key, profile]) => {
                      const gData = trajectoryData.filter((d) => d.group === profile.label);
                      return <Line key={key} data={gData} dataKey="cumulativeShift" name={profile.label} stroke={profile.color} strokeWidth={2} dot={{ r: 3 }} />;
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Chart: Resistance over time */}
              <div style={{ background: "#12121a", borderRadius: "12px", padding: "24px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 4px", color: "#f1faee" }}>
                  「データの抵抗」コードの出現率の推移
                </h3>
                <p style={{ fontSize: "11px", color: "#8d99ae", margin: "0 0 20px" }}>
                  仮説とデータの齟齬に言及する発話の割合（%）
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
                    <XAxis dataKey="session" type="number" domain={[1, 10]} stroke="#555" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#555" tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", fontSize: 11, color: "#e8e6e3" }} />
                    {Object.entries(GROUP_PROFILES).map(([key, profile]) => {
                      const gData = trajectoryData.filter((d) => d.group === profile.label);
                      return <Area key={key} data={gData} dataKey="resistance" name={profile.label} stroke={profile.color} fill={profile.color} fillOpacity={0.1} strokeWidth={2} />;
                    })}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* WHY explanation */}
            <div style={{ marginTop: "32px", background: "#1a0a0e", border: "1px solid #3a1520", borderRadius: "12px", padding: "24px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#e63946", marginBottom: "8px" }}>WHY：なぜ抵抗が統合を駆動するのか</div>
              <p style={{ fontSize: "13px", lineHeight: 1.8, color: "#d4c5c9", margin: 0 }}>
                左図は、各グループの談話パターンの確率分布が初期状態からどれだけ「移動」したかを最適輸送理論のWasserstein距離で測定したものである。
                学際的再構成型（赤系）のグループだけが、分布空間を大きく移動している。右図と照合すると、この移動は「データの抵抗」コードの出現ピーク（セッション4-6付近）の直後に加速している。
                つまり、<strong style={{ color: "#e63946" }}>抵抗を経験すること自体が、談話パターンの確率分布を「押し出す」力として機能している</strong>。
                同一学問型は抵抗を回避するため分布が動かず、分野連携型は抵抗を経験するが分布の移動が途中で止まる。
                ここから得られるWHYの仮説：<strong style={{ color: "#f1faee" }}>「データの抵抗は、学習者の談話パターンの確率分布に対する外力として作用し、分布を初期状態から不可逆的に押し出す。
                この外力の強度と持続時間が、翻訳の3類型間の遷移を決定する」</strong>。
                これはKapurのproductive failureを確率分布の力学として再記述したものであり、「なぜ失敗が学習を促すか」に対する情報幾何学的解答の候補となる。
              </p>
            </div>
          </div>
        )}

        {activeScenario === "entropy" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
              {/* Scatter: Max Entropy vs Final Integration */}
              <div style={{ background: "#12121a", borderRadius: "12px", padding: "24px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 4px", color: "#f1faee" }}>
                  最大エントロピー × 最終的な統合度
                </h3>
                <p style={{ fontSize: "11px", color: "#8d99ae", margin: "0 0 20px" }}>
                  「揺らぎ」のピーク強度と最終セッションの統合的解釈コードの割合
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
                    <XAxis dataKey="maxEntropy" name="最大エントロピー" stroke="#555" tick={{ fontSize: 11 }} label={{ value: "最大エントロピー（揺らぎのピーク）", position: "bottom", fontSize: 11, fill: "#8d99ae" }} />
                    <YAxis dataKey="finalIntegration" name="統合度" stroke="#555" tick={{ fontSize: 11 }} unit="%" label={{ value: "最終統合度 (%)", angle: -90, position: "insideLeft", fontSize: 11, fill: "#8d99ae" }} />
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", fontSize: 11, color: "#e8e6e3" }} formatter={(value, name) => [name === "最大エントロピー" ? value : `${value}%`, name]} />
                    <Scatter data={entropyData} shape="circle">
                      {entropyData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} r={10} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "12px" }}>
                  {Object.entries(TYPE_LABELS).map(([key, label]) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#8d99ae" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: TYPE_COLORS[key] }} />
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bar: Max Resistance by group */}
              <div style={{ background: "#12121a", borderRadius: "12px", padding: "24px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 4px", color: "#f1faee" }}>
                  抵抗のピーク強度 × 最終統合度
                </h3>
                <p style={{ fontSize: "11px", color: "#8d99ae", margin: "0 0 20px" }}>
                  各グループが経験した最大の「抵抗」率と最終的な統合到達度
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={entropyData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
                    <XAxis type="number" stroke="#555" tick={{ fontSize: 11 }} unit="%" />
                    <YAxis dataKey="group" type="category" stroke="#555" tick={{ fontSize: 10 }} width={160} />
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", fontSize: 11, color: "#e8e6e3" }} />
                    <Bar dataKey="maxResistance" name="抵抗ピーク(%)" fill="#e63946" fillOpacity={0.7} barSize={12} />
                    <Bar dataKey="finalIntegration" name="最終統合度(%)" fill="#2a9d8f" fillOpacity={0.7} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ marginTop: "32px", background: "#0a1a15", border: "1px solid #153a30", borderRadius: "12px", padding: "24px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#2a9d8f", marginBottom: "8px" }}>WHY：なぜ揺らぎが統合の前提条件なのか</div>
              <p style={{ fontSize: "13px", lineHeight: 1.8, color: "#c5d4d0", margin: 0 }}>
                左の散布図は、各グループの談話パターンのShannonエントロピーの最大値（＝揺らぎのピーク強度）と、最終セッションの統合的解釈コードの割合の関係を示す。
                <strong style={{ color: "#2a9d8f" }}>エントロピーのピークが高いグループほど、最終的な統合度が高い</strong>。
                右の棒グラフは、抵抗のピーク強度と最終統合度の対応を示す。
                ここから見えるWHYの仮説：<strong style={{ color: "#f1faee" }}>「学際的統合に至るためには、談話パターンのエントロピーが一時的に増大する——すなわち、既存の知識構造が一時的に「溶ける」——段階を経る必要がある。
                この溶解がなければ、新しい構造は結晶化しない」</strong>。
                これは熱力学の相転移のアナロジーであり、橋本敬の複雑系の枠組みで「知識構造の相転移」として理論化できる。
                Kapurのproductive failureは「失敗が学習を促す」という記述だが、情報幾何学的には「エントロピーの一時的増大（秩序の一時的崩壊）が、より高次の秩序への遷移の必要条件である」という、より深い説明原理を提供する。
              </p>
            </div>
          </div>
        )}

        {activeScenario === "topology" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
              {/* Active categories over time */}
              <div style={{ background: "#12121a", borderRadius: "12px", padding: "24px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 4px", color: "#f1faee" }}>
                  アクティブなコードカテゴリ数の推移
                </h3>
                <p style={{ fontSize: "11px", color: "#8d99ae", margin: "0 0 20px" }}>
                  閾値（8%）以上の出現率を持つ談話コードカテゴリの数
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
                    <XAxis dataKey="session" type="number" domain={[1, 10]} stroke="#555" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#555" tick={{ fontSize: 11 }} domain={[0, 7]} label={{ value: "カテゴリ数", angle: -90, position: "insideLeft", fontSize: 11, fill: "#8d99ae" }} />
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", fontSize: 11, color: "#e8e6e3" }} />
                    {Object.entries(GROUP_PROFILES).map(([key, profile]) => {
                      const gData = topologyData.filter((d) => d.group === profile.label);
                      return <Line key={key} data={gData} dataKey="activeCategories" name={profile.label} stroke={profile.color} strokeWidth={2} dot={{ r: 3 }} />;
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Loops over time */}
              <div style={{ background: "#12121a", borderRadius: "12px", padding: "24px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 4px", color: "#f1faee" }}>
                  「ループ」数の推移（TDA的特徴量の近似）
                </h3>
                <p style={{ fontSize: "11px", color: "#8d99ae", margin: "0 0 20px" }}>
                  3つ以上のカテゴリが同時にアクティブ＝新しい接続の創発
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
                    <XAxis dataKey="session" type="number" domain={[1, 10]} stroke="#555" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#555" tick={{ fontSize: 11 }} domain={[0, 5]} label={{ value: "ループ数", angle: -90, position: "insideLeft", fontSize: 11, fill: "#8d99ae" }} />
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", fontSize: 11, color: "#e8e6e3" }} />
                    <ReferenceLine y={2} stroke="#e63946" strokeDasharray="5 5" label={{ value: "統合閾値", fill: "#e63946", fontSize: 10 }} />
                    {Object.entries(GROUP_PROFILES).map(([key, profile]) => {
                      const gData = topologyData.filter((d) => d.group === profile.label);
                      return <Line key={key} data={gData} dataKey="loops" name={profile.label} stroke={profile.color} strokeWidth={2} dot={{ r: 3 }} />;
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ marginTop: "32px", background: "#0a0f1a", border: "1px solid #152a3a", borderRadius: "12px", padding: "24px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#457b9d", marginBottom: "8px" }}>WHY：なぜ新しい接続が創発するのか</div>
              <p style={{ fontSize: "13px", lineHeight: 1.8, color: "#c5cdd4", margin: 0 }}>
                左図は、各セッションで閾値以上の出現率を持つ談話コードカテゴリの数を示す。学際的再構成型は後半に向けてアクティブカテゴリが増加し、
                右図の「ループ数」（3つ以上のカテゴリが同時にアクティブな状態＝パーシステントホモロジーにおけるβ1の近似）も増加する。
                <strong style={{ color: "#457b9d" }}>統合に至るグループだけが、談話のトポロジカル構造に「新しいループ」を獲得する</strong>。
                ここから見えるWHYの仮説：<strong style={{ color: "#f1faee" }}>「学際的統合とは、談話ネットワークのトポロジカル構造に新しい1次元ホモロジー（ループ）が生成されることである。
                このループは、教科Aの推論と教科Bの推論が、データの参照・他分野の概念導入・統合的解釈を介して閉じた回路を形成することで生まれる。
                抵抗は、既存のループを壊す力として機能し、壊れた後により多くの頂点を含む新しいループが形成される」</strong>。
                これはデータ記述科学のTDA軸が提供する視点であり、統合を「トポロジカルな相転移」として理論化する道を開く。
              </p>
            </div>
          </div>
        )}

        {activeScenario === "theory" && (
          <div>
            <div style={{ background: "#12121a", borderRadius: "12px", padding: "32px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 24px", color: "#f1faee" }}>
                3つのWHYを貫く統合原理：<span style={{ color: "#e63946" }}>「知の相転移」仮説</span>
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px", marginBottom: "32px" }}>
                {[
                  { color: "#e63946", axis: "PDA（最適輸送理論）", why: "抵抗は談話分布を押し出す外力", mechanism: "Wasserstein距離の不可逆的増大", analogy: "Kapur の productive failure = 確率分布への外力" },
                  { color: "#2a9d8f", axis: "GDA（情報幾何学）", why: "揺らぎはエントロピーの一時的増大", mechanism: "Fisher計量上の軌跡の屈曲点", analogy: "相転移 = 秩序の一時的崩壊と再結晶化" },
                  { color: "#457b9d", axis: "TDA（位相的データ解析）", why: "統合は新しいループの獲得", mechanism: "β1ホモロジーの生成", analogy: "知識ネットワークのトポロジカル相転移" },
                ].map((item, i) => (
                  <div key={i} style={{ background: "#0a0a0f", borderRadius: "8px", padding: "20px", borderLeft: `3px solid ${item.color}` }}>
                    <div style={{ fontSize: "11px", letterSpacing: "2px", color: item.color, marginBottom: "12px" }}>{item.axis}</div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#f1faee", marginBottom: "8px" }}>WHY: {item.why}</div>
                    <div style={{ fontSize: "12px", color: "#8d99ae", marginBottom: "8px" }}>メカニズム: {item.mechanism}</div>
                    <div style={{ fontSize: "11px", color: "#666", fontStyle: "italic" }}>{item.analogy}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: "#1a0a0e", border: "1px solid #3a1520", borderRadius: "8px", padding: "24px", marginBottom: "24px" }}>
                <h4 style={{ fontSize: "14px", color: "#e63946", margin: "0 0 12px" }}>統合原理：学際的統合は知識構造の相転移である</h4>
                <p style={{ fontSize: "13px", lineHeight: 1.9, color: "#d4c5c9", margin: 0 }}>
                  3つのシナリオを貫く原理は、<strong>学際的統合は「知識構造の相転移」である</strong>という仮説に収束する。
                  物理学における相転移（氷→水→水蒸気）では、(1) エネルギーの投入（外力）、(2) 秩序の一時的崩壊（エントロピー増大）、(3) 新しい秩序の結晶化（位相的構造変化）が不可逆的に生じる。
                  学際的統合においても同じ3段階が観察される。
                  <br/><br/>
                  <strong style={{ color: "#f1faee" }}>(1) データの抵抗 = 外力の投入</strong>（PDA的記述：Wasserstein距離の増大）。
                  仮説とデータの齟齬が、学習者の既存の談話パターンの確率分布を平衡状態から押し出す。
                  <br/>
                  <strong style={{ color: "#f1faee" }}>(2) 揺らぎ = 秩序の一時的崩壊</strong>（GDA的記述：統計多様体上の軌跡の屈曲、エントロピーの極大）。
                  既存の知識構造が「溶ける」段階であり、博論第4章の「冗長化」に対応する。
                  <br/>
                  <strong style={{ color: "#f1faee" }}>(3) 新しいループの獲得 = 新しい秩序の結晶化</strong>（TDA的記述：β1ホモロジーの生成）。
                  異なる教科の推論が統合的解釈を介して閉じた回路を形成する。
                  <br/><br/>
                  この「知の相転移」仮説は、howを超えたwhyを提供する。Kapurの「なぜ失敗が学習を促すか」に対して、
                  「<strong style={{ color: "#e63946" }}>失敗（抵抗）は知識構造の相転移を駆動する外力であり、エントロピーの一時的増大を経て、
                  より高次のトポロジカル構造への不可逆的遷移を引き起こすから</strong>」と答えることができる。
                  これは橋本敬の複雑適応系の枠組みと、Pickeringの「抵抗と適応の弁証法」を、データ記述科学のGToP三軸で再定式化したものである。
                </p>
              </div>

              <div style={{ background: "#0a0f1a", border: "1px solid #152a3a", borderRadius: "8px", padding: "24px" }}>
                <h4 style={{ fontSize: "14px", color: "#457b9d", margin: "0 0 12px" }}>基盤Sへの接続：「知の相転移」理論の射程</h4>
                <p style={{ fontSize: "13px", lineHeight: 1.9, color: "#c5cdd4", margin: 0 }}>
                  この「知の相転移」仮説が正しければ、教室での学際的統合と、科学者の研究室でのパラダイム転換は、
                  同じ相転移メカニズムの異なるスケールでの現れとして統一的に理解できる。
                  Kuhnのパラダイムシフトをエントロピー増大→トポロジカル再構成として再記述できる可能性が開かれ、
                  基盤Sの「知の創発メカニズムの統合的理論」、さらには学術変革の「創発的知識共創学」の理論的核心となる。
                  <br/><br/>
                  <strong>実現可能性の評価：</strong>ダミーデータでのシナリオは数学的に整合的であり、
                  データ記述科学のGToP三軸の既存ツール（HomCloud、最適輸送ライブラリ等）で計算可能である。
                  ただし、学習科学のデータ（N=30〜50）で統計的に有意なパターンが検出できるかは実データでの検証が必要であり、
                  これがまさに萌芽段階での「探索的試行」の核心的課題となる。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
