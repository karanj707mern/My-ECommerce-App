import { useState, useEffect } from "react";

const useAdminLoading = (dependencies: any[]) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    // Add any async data fetching here
    // ...

    setLoading(false);
  }, dependencies);

  return loading;
};

export default useAdminLoading;
