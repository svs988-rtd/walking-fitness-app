import React from 'react';
import './App.css';
import WalkingTimer from './components/WalkingTimer';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Walking Fitness</h1>
        <p>Start your gentle fitness journey</p>
      </header>
      <main>
        <WalkingTimer />
      </main>
    </div>
  );
}

export default App;