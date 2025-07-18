import React from 'react';
import './WalkingAnimation.css';

interface WalkingAnimationProps {
  isActive: boolean;
}

const WalkingAnimation: React.FC<WalkingAnimationProps> = ({ isActive }) => {
  return (
    <div className={`walking-animation ${isActive ? 'active' : ''}`}>
      <div className="person">
        <div className="head"></div>
        <div className="body"></div>
        <div className="arm arm-left"></div>
        <div className="arm arm-right"></div>
        <div className="leg leg-left"></div>
        <div className="leg leg-right"></div>
      </div>
      <div className="ground">
        <div className="step step-1"></div>
        <div className="step step-2"></div>
        <div className="step step-3"></div>
      </div>
    </div>
  );
};

export default WalkingAnimation;