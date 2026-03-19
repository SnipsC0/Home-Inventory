import { useEffect, useState } from 'react';

export const useLoadingImage = (imageSrc: string | null | undefined) => {
  const [loadingImage, setLoadingImage] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setLoadingImage(true);
    setImageError(false);
  }, [imageSrc]);

  return {
    loadingImage,
    imageError,
    setImageError,
    setLoadingImage,
  };
};
