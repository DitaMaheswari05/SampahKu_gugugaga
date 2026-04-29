import express, { Request, Response } from 'express'
import cors from 'cors'
import { supabase } from './config/supabase'

const app = express()
const PORT = process.env.PORT || 5000;

app.use(cors())
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})