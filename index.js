document.addEventListener('DOMContentLoaded', () => {
    const state = {
        currentId: null,
        participant:null,
        task1: {startedAt: null, finishedAt: null, duration: null, found:0, errors:0},
        task2: {readingStartedAt:null, readingFinishedAt:null, readingDuration: null, compCorrect:0},
        results: []
    };
    
    const participantId = sessionStorage.getItem('participantId');
    if(!participantId) {
        console.error("No participant ID found!");
    }
    state.currentId = participantId || "Anonymous";

    function setTheme(mode) {
        document.body.setAttribute('data-theme', mode === 'Dark mode' ? 'dark' : 'light');
    }
    
    document.getElementById('applyModeBtn').addEventListener('click', () => {
        const mode = document.getElementById('sessionMode').value;
        setTheme(mode);
        alert('Mode applied: ' + mode + '. Please ensure device display matches this mode if  possible.');
    });
    
    // Clear
    document.getElementById('clearBtn').addEventListener('click', () => {
        if(!confirm('Clear all fields and reset?')) return;
        document.getElementById('device').value = 'laptop';
        document.getElementById('ambient').value = 'Bright (office)';
        document.getElementById('brightness').value = 80
        document.getElementById('sessionMode').value = 'Light mode';
        setTheme('Light mode');
    
    });
    
    // Task 1 implementation
    const wordPool = [
        "contrast","brightness","reading","fatigue","dark","light","display","comfort","blink",
        "flicker","response","focus","task","accuracy","speed","design","interface","mode",
        "screen","vision","dry","strain","user","performance","hours","break","distance","font",
        "color","ambient","glare","test","result","data","study","sample","group","random"
    ];
    
    function shuffle(a){
        for (let i=a.length-1; i > 0; i--) {
            const j=Math.floor(Math.random()*(i+1));
            [a[i],a[j]]=[a[j],a[i]];
        }
        return a;
    }
    
    let targets = [];
    let gridWords = [];
    
    function prepareTask1(){
        const poolCopy = shuffle([...wordPool]);
        targets = poolCopy.slice(0,6);
        gridWords = shuffle(poolCopy.slice(0, 36));
        targets.forEach((t, i) => {
            if(!gridWords.includes(t)) gridWords[i] = t;
        });
    
        // Render targets
        const targetList = document.getElementById('targetsList');
        targetList.innerHTML = '';
        targets.forEach(t => {
            const el = document.createElement('div');
            el.textContent = t;
            el.style.padding = '6px 8px';
            el.style.border = '1px dashed rgba(0, 0, 0, 0.08)';
            el.style.borderRadius = '6px';
            el.style.fontSize = '0.9rem';
            targetList.appendChild(el);
        });
    
        const grid = document.getElementById('wordGrid');
        grid.innerHTML = '';
        gridWords.forEach((w, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'word-btn';
            btn.textContent = w;
            btn.dataset.word = w;
            btn.addEventListener('click', onWordClick);
            grid.appendChild(btn);
        });
    
        document.getElementById('targetsWrap').classList.remove('hidden');
        document.getElementById('task1Status').textContent = 'Selected: 0';
        state.task1 = {startedAt: null, finishedAt:null, duration:null, found:0, errors:0};
        document.getElementById('task1Timer').textContent = 'Time: 0.00 s';
    }
    
    // Timer helpers
    let task1Interval = null;
    function startTimerDisplay(key, displayId) {
        const displayEl = document.getElementById(displayId);
        if(!displayEl) {
            console.error(`Element ${displayId} not found`);
            return;
        }
        const start = performance.now();
        state[key].startedAt = start;
        const update = () => {
            const now = performance.now();
            const sec = ((now - start) / 1000).toFixed(2);
            displayEl.textcontent = (displayId === 'task1Timer' ? 'Time: ' : 'Reading time: ') + sec + ' s';
        };
        update();
        return setInterval(update, 100);
    }
    
    function onWordClick(event) {
        const btn = event.currentTarget;
        if (!btn || !btn.dataset.word) return;

        if(!state.task1.startedAt) return;
        if (btn.classList.contains('found')) return;

        const w = btn.dataset.word.trim();
        if(targets.includes(w)) {
            btn.classList.add('found');
            state.task1.found++;            
        } else {
            btn.classList.add('error');
            state.task1.errors++;
            setTimeout(() => btn.classList.remove('error'), 600);
        }

        document.getElementById('task1Status').textContent = 
        `Selected: ${state.task1.found} Errors: ${state.task1.errors}`;

        if (state.task1.found >= targets.length) finishTask1();
    }
    
    // Start and finish task1
    document.getElementById('startTask1').addEventListener('click', () => {
        prepareTask1();
        document.getElementById('startTask1').disabled = true;
        document.getElementById('finishTask1').disabled = false;
        task1Interval = startTimerDisplay('task1', 'task1Timer');
    });
    
    function finishTask1() {
        if(!state.task1.startedAt) {
            state.task1.startedAt = performance.now();        
        }
        state.task1.finishedAt = performance.now();
        state.task1.duration = ((state.task1.finishedAt - state.task1.startedAt) / 1000).toFixed(2);
        clearInterval(task1Interval);
        document.getElementById('task1Timer').textContent = 'Time: ' + state.task1.duration + ' s';
        document.getElementById('finishTask1').disabled = true;
        document.getElementById('startTask1').disabled = false;
    
        //enable reading stage
    
        document.getElementById('startReading').disabled = false;
    
    
        //show results summary in results pre
        const participant = state.currentId;
        const mode = document.getElementById('sessionMode').value;
        const device = document.getElementById('device').value;
        const ambient = document.getElementById('ambient').value;
        const brightness = document.getElementById('brightness').value;
    
        const task1Result = {
            participant, device, ambient, brightness, mode,
            task1_duration_s: state.task1.duration,
            task1_found: state.task1.found,
            task1_errors: state.task1.errors
        };

        
    
        // state.results = state.results || [];
        // state.results.push({phase:'task1', data:task1Result, timestamp: new Date().toISOString()});
        const existing = state.results.find(r => r.participant === state.currentId);
        if(existing) {
            existing.data = {...existing.data, ...task1Result};
        } else {
            state.results.push({
                participant:state.currentId,
                data:task1Result,
                timestamp: new Date().toISOString()
            });
        }
        updateResultsPre();
    }
    
    document.getElementById('finishTask1').addEventListener('click', finishTask1);
    
    // Task 2: Reading & comprehension
    let readingInterval = null;
    document.getElementById('startReading').addEventListener('click', () => {
        document.getElementById('passageWrap').classList.remove('hidden');
        document.getElementById('startReading').disabled = true;
        document.getElementById('doneReading').disabled = false;
    
        //start reading timer
        state.task2.readingStartedAt = performance.now();
        readingInterval = setInterval(() => {
            const now = performance.now();
            document.getElementById('readingTimer').textContent = 'Reading time: ' + ((now - state.task2.readingStartedAt) / 1000).toFixed(2) + ' s';
        }, 100);
        
    });
    
    document.getElementById('doneReading').addEventListener('click', () => {
        if(!state.task2.readingStartedAt) return;
        state.task2.readingFinishedAt = performance.now();
        state.task2.readingDuration = ((state.task2.readingFinishedAt - state.task2.readingStartedAt) / 1000 ).toFixed(2);
        clearInterval(readingInterval);
        document.getElementById('readingTimer').textContent = 'Reading time: ' + state.task2.readingDuration + ' s';
    
        //reveal comprehension questions
        document.getElementById('comprehensionWrap').classList.remove('hidden');
        document.getElementById('submitComprehension').disabled = false;
        document.getElementById('doneReading').disabled = true;
    });
    
    // Submit comprehension
    // document.getElementById('submitComprehension').addEventListener('click', () => {
    //     //Check answers
    //     const f = document.getElementById('comprehensionForm');
    //     const a1 = f.q1.value;
    //     const a2 = f.q2.value;
    //     const a3 = f.q3.value;
    //     if(!a1 || !a2 || !a3) { alert('Please answer all comprehension questions.'); return;}
    
    //     const correct = (a1 === 'B') + (a2 === 'B') + (a3 === 'A');
    //     state.task2.compCorrect = correct;
    
    //     const participant = state.currentId;
    //     const mode = document.getElementById('sessionMode').value;
    //     const device = document.getElementById('device').value;
    //     const ambient = document.getElementById('ambient').value;
    //     const brightness = document.getElementById('brightness').value;
    
    //     const task2Result = {
    //         participant, device, ambient, brightness, mode,
    //         reading_time_s: state.task2.readingDuration,
    //         comp_correct: state.task2.compCorrect
    //     };
    
    //     // state.results.push({phase:'task2', data:task2Result, timestamp: new Date().toISOString()});
    //     const existing = state.results.find(r => r.participant === state.currentId);
    //     if(existing) {
    //         existing.data = { ...existing.data, ...task2Result };
    //         existing.timestamp = new Date().toISOString();
    //     } else {
    //         state.results.push({
    //             participant:state.currentId,
    //             data: task2Result,
    //             timestamp: new Date().toISOString()
    //         });
    //     }
    //     updateResultsPre();
    //     sendToGoogleSheet(state.results[state.results.length - 1].data);
    //     document.getElementById('compStatus').textContent = `Score: ${correct} / 3`;
    //     document.getElementById('submitComprehension').disabled = true;
    //     // document.getElementById('startReading').disabled = false;
    //     // document.getElementById('downloadCsv').disabled = false;

    //     const task1Card = document.getElementById('task1Card');
    //     const task2Card = document.getElementById('task2Card');
    //     const resultsCard = document.getElementById('resultsCard');
    //     const thankYouCard = document.getElementById('thankYouCard');

    //     task1Card.classList.add('hidden');
    //     task2Card.classList.add('hidden');
    //     resultsCard.classList.add('hidden');
    //     thankYouCard.classList.remove('hidden');

    //     window.scrollTo(0,0);
    
    // });

    // Replace your old listener with this one
    document.getElementById('submitComprehension').addEventListener('click', () => {
        // 1. Check answers and prevent submission if incomplete
        const f = document.getElementById('comprehensionForm');
        const a1 = f.q1.value;
        const a2 = f.q2.value;
        const a3 = f.q3.value;
        if (!a1 || !a2 || !a3) {
            alert('Please answer all comprehension questions.');
            return;
        }

        // 2. Calculate score and update final state
        const correct = (a1 === 'B') + (a2 === 'B') + (a3 === 'A');
        state.task2.compCorrect = correct;

        const participant = state.currentId;
        const mode = document.getElementById('sessionMode').value;
        const device = document.getElementById('device').value;
        const ambient = document.getElementById('ambient').value;
        const brightness = document.getElementById('brightness').value;

        const task2Result = {
            participant, device, ambient, brightness, mode,
            reading_time_s: state.task2.readingDuration,
            comp_correct: state.task2.compCorrect
        };

        const existing = state.results.find(r => r.participant === state.currentId);
        if (existing) {
            existing.data = { ...existing.data, ...task2Result };
            existing.timestamp = new Date().toISOString();
        }
        // Update the UI with the final score
        document.getElementById('compStatus').textContent = `Score: ${correct} / 3`;
        document.getElementById('submitComprehension').disabled = true;

        // 3. IMMEDIATELY update the UI to show the "Thank You" message
        const task1Card = document.getElementById('task1Card');
        const task2Card = document.getElementById('task2Card');
        const resultsCard = document.getElementById('resultsCard');
        const thankYouCard = document.getElementById('thankYouCard');

        task1Card.classList.add('hidden');
        task2Card.classList.add('hidden');
        resultsCard.classList.add('hidden');
        thankYouCard.classList.remove('hidden');

        window.scrollTo(0, 0);

        // 4. FINALLY, send the data in the background
        // This now runs last, so even if it fails, the user experience is complete.
        updateResultsPre(); // Update the (now hidden) table one last time
        sendToGoogleSheet(existing.data);
    });
    
    // Display Results
    function updateResultsPre() {
        const tbody = document.getElementById('resultsBody');
        tbody.innerHTML = '';
        
        if(!state.results || state.results.length === 0) {
            tbody.innerHTML = '<tr><td colspan="12" style="color:gray;">No results yet.</td></tr>';
            return;
        }
        state.results.forEach((r, index) => {
            const d = r.data || {};
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${r.participant}</td>
                <td>${d.mode}</td>
                <td>${d.device}</td>
                <td>${d.ambient}</td>
                <td>${d.brightness}</td>
                <td>${d.task1_duration_s}</td>
                <td>${d.task1_found}</td>
                <td>${d.task1_errors}</td>
                <td>${d.reading_time_s}</td>
                <td>${d.comp_correct}</td>
                <td>${new Date(r.timestamp).toLocaleTimeString()}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // Send to Google Sheets
    function sendToGoogleSheet(data) {
        const url = "https://script.google.com/macros/s/AKfycbzuzRi14jXFLAzEA0a3igY26Kh4TKKvSftDEUmcOvUnGX1cJDYXSr69cSTwYtaPhQpq/exec";
        console.log('Sending data to Google Sheets:', data);
        
        // Fire-and-forget the request without awaiting a response
        fetch(url, {
            method: 'POST',
            mode: 'no-cors', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).catch(error => console.error('Error sending data:', error)); // Optional: Log errors
    }
    
    // // CSV Report
    // function toCSVRow(vals) {
    //     return vals.map(v => {
    //         if( v === null | v === undefined) return '';
    //         const s = String(v).replace(/"/g, '""');
    //         return `"${s}`;
    
    //     }).join(',');
    // }
    
    // document.getElementById('downloadCsv').addEventListener('click', () => {
    //     if(!state.results || state.results.length === 0) {
    //         alert('No data to download.');
    //         return;
    //     }
    //     const header = ['participant', 'device', 'ambient', 'brightness_pct', 'mode', 'phase', 'task1_duration_s', 'task1_found', 'task1_errors', 'reading_time_s', 'comp_correct', 'timestamp'];
    //     const rows = [header];
    //     state.results.forEach(r => {
    //         const d = r.data || {};
    //         const row = [
    //             d.participant || '',
    //             d.device || '',
    //             d.ambient || '',
    //             d.brightness || '',
    //             d.mode || '',
    //             r.phase || '',
    //             d.task1_duration_s || '',
    //             d.task1_found || '',
    //             d.task1_errors || '',
    //             d.reading_time_s || '',
    //             d.comp_correct || '',
    //             r.timestamp || '',
    //         ];
    //         rows.push(row);
    //     });
    
    //     const csvContent = rows.map(r => toCSVRow(r)).join('\n');
    //     const blob = new Blob([csvContent], {type: 'text/csv;charset-utf-8;'});
    //     const url = URL.createObjectURL(blob);
    //     const a = document.createElement('a');
    //     a.href = url; a.download = `${document.getElementById('participant')}_results.csv`;
    //     document.body.appendChild(a); a.click(); a.remove();
    //     URL.revokeObjectURL(url);
    // });    
    
    //reset results
    // document.getElementById('resetResults').addEventListener('click', () => {
    //     if(!confirm('Reset collected results for this participant?')) return;
    //     state.results = [];
    //     state.task1 = {startedAt: null, finishedAt: null, duration: null, found:0, errors:0};
    //     state.task2 = {readingStartedAt:null, readingFinishedAt:null, readingDuration: null, compCorrect:0};
    //     updateResultsPre();
    //     document.getElementById('downloadCsv').disabled = true;
    //     document.getElementById('submitComprehension').disabled = true;
    //     document.getElementById('startReading').disabled = false;
    // });
    
    //small UX: when sessio mode selection changes, auto-apply
    document.getElementById('sessionMode').addEventListener('change', (e) => setTheme(e.target.value));
    
    setTheme('Light mode');
    updateResultsPre();
});
