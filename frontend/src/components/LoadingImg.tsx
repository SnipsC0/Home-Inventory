import React from 'react';

/**
 * Un spinner simplu de încărcare, compatibil Tailwind CSS.
 * Poate fi folosit ca placeholder în timp ce o imagine se încarcă.
 *
 * @param {number} size - Dimensiunea spinnerului (implicit 8, corespunde la 2rem/32px în sistemul Tailwind)
 * @param {string} color - Culoarea inelului exterior (implicit blue-500)
 */
interface LoadingSpinnerProps {
  size?: number; // ex: 8 (pentru w-8/h-8)
  color?: string; // ex: 'blue-500'
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = () => {
  // Conversia dimensiunii în clasă Tailwind (e.g., 8 -> w-8)
  const sizeClass = `w-8 h-8`;
  // Construiește clasa pentru culoarea inelului de bază (e.g., border-gray-300)
  const baseBorderColor = 'border-gray-300';
  // Construiește clasa pentru culoarea secțiunii în mișcare (e.g., border-t-blue-500)
  const activeBorderColor = `border-t-gray-400`;

  return (
    <div
      className={`
        ${sizeClass}
        ${baseBorderColor}
        ${activeBorderColor}
        border-4
        rounded-full
        animate-spin
        flex items-center justify-center
        
      `}
      role="status"
    >
      <span className="sr-only">Încărcare...</span>
    </div>
  );
};

export default LoadingSpinner;
