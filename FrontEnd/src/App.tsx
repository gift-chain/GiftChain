import { useState } from 'react'
import Home from './pages/Home'
import { Web3Provider } from './Web3Provider'

function App() {
  const [count, setCount] = useState(0)

  return (
    <Web3Provider>
      <Home />
    </Web3Provider>
  )
}

export default App
