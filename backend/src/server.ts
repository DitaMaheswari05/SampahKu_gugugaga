import express, { Request, Response } from 'express'
import cors from 'cors'
import { supabase } from './config/supabase'
import authRouter from './routes/auth'
import instancesRouter from './routes/instances'
import productsRouter from './routes/products'
import petugasRouter from './routes/petugas'
import uploadRouter from './routes/upload'

// Resolve DNS issue
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');


const app = express()
const PORT = process.env.PORT || 5000;

app.use(cors())
app.use(express.json());
app.use('/auth', authRouter);
app.use('/instances', instancesRouter);
app.use('/products', productsRouter);
app.use('/petugas', petugasRouter);
app.use('/upload', uploadRouter);

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'Server is running'
  })
})

app.get('/test-supabase', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('hackathon_test').select('*');
  if(error) return res.status(500).json(error);
  return res.json(data);
})

// Global error handler
app.use((err: any, req: Request, res: Response, next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

// buat deploy
app.get('/test-supabase', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('hackathon_test').select('*');
  if(error) return res.status(500).json(error);
  return res.json(data);
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;