#!/bin/bash
# Start both Backend and Frontend servers

# Function to kill child processes on exit
cleanup() {
    echo "Stopping servers..."
    kill $(jobs -p) 2>/dev/null
    exit
}

# Trap Ctrl+C and call cleanup
trap cleanup SIGINT SIGTERM

echo "Starting Backend (Port 8000)..."
cd backend
# Activate venv if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo "Starting Frontend (Port 4321)..."
cd ../frontend
npm run dev -- --host &
FRONTEND_PID=$!

echo "------------------------------------------------"
echo "✅ Servers running!"
echo "   📱 Network: http://10.0.0.2:4321"
echo "   💻 Local:   http://localhost:4321"
echo "------------------------------------------------"
echo "Press Ctrl+C to stop both servers."

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
