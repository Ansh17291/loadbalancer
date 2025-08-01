import axios from 'axios';

(async () => {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await axios.get('http://localhost:8080');
      console.log(`[${i}] -> Correct`, res.data);
    } catch (err: any) {
      console.error(`[${i}] -> Err`, err.response?.status, err.response?.data);
    }
  }
})();
