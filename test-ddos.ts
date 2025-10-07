import axios from 'axios';

(async () => {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await axios.get('http://localhost:8080');
      console.log(`[${i}] -> Correct`, res.data);
    } catch (err: any) {
      // Log detailed error information (covers network errors and HTTP errors)
      const status = err.response?.status;
      const statusText = err.response?.statusText;
      const data = err.response?.data;
      console.error(`[${i}] -> Err`, {
        status: status ?? 'NO_RESPONSE',
        statusText: statusText ?? null,
        data: data ?? null,
        message: err.message,
        code: err.code ?? null,
      });
    }
  }
})();
