import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../App';
import Button from './Button';
import IosInstallModal from './IosInstallModal';

interface InstallPwaButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches;

const InstallPwaButton: React.FC<InstallPwaButtonProps> = ({ className, variant = 'secondary' }) => {
  const { installPrompt, triggerInstall } = useContext(AppContext);
  const [showIosModal, setShowIosModal] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // A verificação é refeita quando o installPrompt muda
    const criteriaMet = (installPrompt || isIOS()) && !isStandalone();
    setCanInstall(criteriaMet);
  }, [installPrompt]);


  if (!canInstall) {
    return null;
  }

  const handleInstallClick = () => {
    if (installPrompt) {
      triggerInstall();
    } else if (isIOS()) {
      setShowIosModal(true);
    }
  };

  return (
    <>
      <Button onClick={handleInstallClick} variant={variant} className={className}>
        Instalar App
      </Button>
      {showIosModal && <IosInstallModal onClose={() => setShowIosModal(false)} />}
    </>
  );
};

export default InstallPwaButton;
