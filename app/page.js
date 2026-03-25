"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../lib/firebase";
import { processFirebaseHistory, generatePredictionLine } from "../lib/regression";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import "chartjs-adapter-moment";

export default function Page() {
  const [statusText, setStatusText] = useState("Conectando...");
  
  // Realtime Current values
  const [temp1, setTemp1] = useState(null);
  const [temp2, setTemp2] = useState(null);
  
  // Clock state
  const [time, setTime] = useState(new Date());

  // Chart and Metrics states
  const [chartDataTemp, setChartDataTemp] = useState({ datasets: [] });
  const [metricsTemp, setMetricsTemp] = useState({ s1: { r2: 0, mse: 0 }, s2: { r2: 0, mse: 0 } });

  // Historical data for CSV export
  const [historicalData, setHistoricalData] = useState({ temp1: [], temp2: [] });

  // Update Clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Firebase Setup and Listeners
  useEffect(() => {
    setStatusText("Conectado y Leyendo");

    // Firebase paths
    const s1Temp = ref(db, 'Sensor1/temperature');
    const s2Temp = ref(db, 'Sensor2/temperature');
    const s1LogT = ref(db, 'Sensor1/json/value/log_temp');
    const s2LogT = ref(db, 'Sensor2/json/value/log_temp');

    // Subscribe current values
    const unsubT1 = onValue(s1Temp, snap => setTemp1(snap.val()));
    const unsubT2 = onValue(s2Temp, snap => setTemp2(snap.val()));

    // Cache to process and map charts
    let dt1 = null, dt2 = null;

    const updateChartsAndMetrics = () => {
        // Init Datasets
        let dsTemp = [
            { label: 'Abierta T (Real)', data: [], borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.1)', borderWidth: 2, pointRadius: 4, fill: false },
            { label: 'Abierta T (RLS)', data: [], borderColor: '#7dd3fc', borderDash: [5,5], borderWidth: 2, pointRadius: 0, fill: false },
            { label: 'Cerrada T (Real)', data: [], borderColor: '#fb923c', backgroundColor: 'rgba(251,146,60,0.1)', borderWidth: 2, pointRadius: 4, fill: false },
            { label: 'Cerrada T (RLS)', data: [], borderColor: '#fdba74', borderDash: [5,5], borderWidth: 2, pointRadius: 0, fill: false }
        ];

        let mt = { s1: {r2:0, mse:0}, s2: {r2:0, mse:0} };
        let hist = { temp1: [], temp2: [] };

        // Process Temp Sensor 1
        if (dt1) {
            let real = processFirebaseHistory(dt1);
            hist.temp1 = real;
            if(real.length > 0) {
                dsTemp[0].data = real.map(pt => ({x: new Date(pt.x*1000), y: pt.y}));
                let {data, metrics} = generatePredictionLine(real, 6);
                dsTemp[1].data = data.map(pt => ({x: new Date(pt.x*1000), y: pt.y}));
                mt.s1 = metrics;
            }
        }
        
        // Process Temp Sensor 2
        if (dt2) {
            let real = processFirebaseHistory(dt2);
            hist.temp2 = real;
            if(real.length > 0) {
                dsTemp[2].data = real.map(pt => ({x: new Date(pt.x*1000), y: pt.y}));
                let {data, metrics} = generatePredictionLine(real, 6);
                dsTemp[3].data = data.map(pt => ({x: new Date(pt.x*1000), y: pt.y}));
                mt.s2 = metrics;
            }
        }

        // Apply state updates
        setChartDataTemp({datasets: dsTemp});
        setMetricsTemp(mt);
        setHistoricalData(hist);
    };

    // Subscriptions for logs
    const unsubLT1 = onValue(s1LogT, snap => { dt1 = snap.val(); updateChartsAndMetrics(); });
    const unsubLT2 = onValue(s2LogT, snap => { dt2 = snap.val(); updateChartsAndMetrics(); });

    // Cleanup hook
    return () => {
        unsubT1(); unsubT2();
        unsubLT1(); unsubLT2();
    };
  }, []);

  const exportCSV = () => {
     // Aggregating unique timestamps
     let allTs = new Set();
     historicalData.temp1.forEach(d => allTs.add(d.x));
     historicalData.temp2.forEach(d => allTs.add(d.x));

     let sortedTS = Array.from(allTs).sort((a,b) => a - b);

     // Build CSV
     let csvContent = "data:text/csv;charset=utf-8,";
     csvContent += "Fecha Hora Local,Timestamp,Temp Abierta,Temp Cerrada\n";

     sortedTS.forEach(ts => {
         let dateStr = new Date(ts * 1000).toLocaleString();
         let t1 = historicalData.temp1.find(d => d.x === ts)?.y ?? "";
         let t2 = historicalData.temp2.find(d => d.x === ts)?.y ?? "";
         csvContent += `"${dateStr}",${ts},${t1},${t2}\n`;
     });

     // Download routine
     const encodedUri = encodeURI(csvContent);
     const link = document.createElement("a");
     link.setAttribute("href", encodedUri);
     link.setAttribute("download", "datos_iot_historico.csv");
     document.body.appendChild(link);
     link.click();
     try { document.body.removeChild(link); } catch (e) {}
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#f1f5f9' } },
      tooltip: { mode: 'index', intersect: false, backgroundColor: 'rgba(15, 23, 42, 0.9)' }
    },
    scales: {
      x: { type: 'time', time: { tooltipFormat: 'LLLL', displayFormats: { minute: 'HH:mm' } }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
    }
  };

  return (
    <div className="dashboard-container">
        <div className="header">
            <h1>Análisis IoT y Evaluación RLS</h1>
            <p style={{color: "#94a3b8", marginBottom: "0.5rem"}}>Temperatura - Sensor Abierto vs Cerrado</p>
            {/* Clock component Requirement */}
            <div style={{color: "#4ade80", fontSize: "1.1rem", fontWeight: "600"}}>
               ⌚ {time.toLocaleDateString()} - {time.toLocaleTimeString()}
            </div>
        </div>

        <div className="glass-card controls-row" style={{justifyContent: "space-between"}}>
            <div>
                <span style={{color: "#94a3b8", fontSize: "1rem"}}>
                  Estado Firebase: <strong style={{color: "#4ade80"}}>{statusText}</strong>
                </span>
            </div>
            
            {/* Export Requirement */}
            <button 
                onClick={exportCSV}
                style={{
                    background: "linear-gradient(135deg, #38bdf8, #818cf8)",
                    border: "none", color: "white", padding: "10px 20px",
                    borderRadius: "8px", cursor: "pointer", fontWeight: "600",
                    boxShadow: "0px 4px 10px rgba(56, 189, 248, 0.3)"
                }}>
                Descargar Histórico CSV
            </button>
        </div>

        {/* Visuals and metrics panel */}
        <div className="metrics-grid">
            <div className="glass-card metric" style={{padding: "1.5rem"}}>
                <div className="metric-label" style={{color:"#38bdf8"}}>Abierta: Temp</div>
                <div className="metric-value" style={{fontSize: "2.5rem"}}>{temp1 !== null ? temp1 + "°C" : "--°C"}</div>
                <div style={{fontSize: "0.85rem", color: "#94a3b8", marginTop:"10px", fontWeight:"500", background:"rgba(0,0,0,0.2)", padding:"8px", borderRadius:"6px"}}>
                   <b>Métricas Modelo RLS</b><br/>
                   R²: {metricsTemp.s1.r2.toFixed(3)} | MSE: {metricsTemp.s1.mse.toFixed(3)}
                </div>
            </div>
            <div className="glass-card metric" style={{padding: "1.5rem"}}>
                <div className="metric-label" style={{color:"#fb923c"}}>Cerrada: Temp</div>
                <div className="metric-value" style={{color:"#fb923c", fontSize: "2.5rem"}}>{temp2 !== null ? temp2 + "°C" : "--°C"}</div>
                <div style={{fontSize: "0.85rem", color: "#94a3b8", marginTop:"10px", fontWeight:"500", background:"rgba(0,0,0,0.2)", padding:"8px", borderRadius:"6px"}}>
                   <b>Métricas Modelo RLS</b><br/>
                   R²: {metricsTemp.s2.r2.toFixed(3)} | MSE: {metricsTemp.s2.mse.toFixed(3)}
                </div>
            </div>
        </div>

        {/* Charts */}
        <div className="glass-card">
            <div className="metric-label" style={{textAlign:"center", marginBottom:"1.5rem"}}>
              Evaluación Visual RLS: Histórico Predicción Temperatura
            </div>
            <div className="chart-container">
                <Line data={chartDataTemp} options={commonOptions} />
            </div>
        </div>
    </div>
  );
}
