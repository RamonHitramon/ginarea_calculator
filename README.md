# GinArea Calculator

A web-based calculator for GinArea trading bot parameters with advanced Order Size calculation logic.

## Features

- **Multi-exchange support**: OKX, BYBT, BMEX
- **Dynamic pair loading**: Automatic loading of trading pairs from JSON files
- **Advanced Order Size calculation**: 
  - Order Size Ratio multiplication
  - Min Order Size rounding
  - Max Order Size limits
- **Grid trading parameters**: Grid Step and Grid Step Ratio calculations
- **Real-time calculations**: Instant parameter updates and validation
- **Responsive design**: Works on desktop and mobile devices

## How to Use

1. **Select Exchange**: Choose your trading exchange (OKX, BYBT, BMEX)
2. **Select Pair**: Choose a trading pair (automatically filtered by exchange)
3. **Set Parameters**:
   - **Deposit**: Your initial deposit amount
   - **Direction**: Long or Short position
   - **Current Price**: Current market price
   - **Grid Step %**: Initial grid step percentage
   - **Grid Step Ratio**: Multiplier for grid step increase
   - **Max Trigger Number**: Maximum number of triggers
   - **Order Size**: Initial order size in coins
   - **Max Order Size**: Maximum order size limit
   - **Order Size Ratio**: Multiplier for order size increase
   - **Target Distance**: Target profit distance
   - **Min Stop Profit**: Minimum stop profit percentage
4. **Calculate**: Click the green "Calculate" button to generate results

## Order Size Calculation Logic

The calculator implements advanced Order Size calculation:

1. **Order Size cal**: Raw calculation value (previous × ratio)
2. **Order Size**: Rounded down to nearest Min Order Size multiple
3. **Validation**: Ensures Order Size is not less than Min Order Size

### Example
- Initial Order Size: 0.02
- Order Size Ratio: 1.07
- Min Order Size: 0.01

**Results:**
- Trigger 1: Order Size = 0.02
- Trigger 2-6: Order Size = 0.02 (rounded down)
- Trigger 7+: Order Size = 0.03 (when cal exceeds threshold)

## Technical Details

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Data Format**: JSON files for exchange pairs
- **Validation**: Client-side parameter validation
- **Responsive**: Mobile-friendly design
- **No Dependencies**: Pure vanilla JavaScript

## File Structure

```
ginarea_calculator/
├── index.html          # Main HTML file
├── styles.css          # CSS styles
├── script.js           # JavaScript logic
├── pairs-okx.json      # OKX trading pairs
├── pairs-bybt.json     # BYBT trading pairs
├── pairs-bmex.json     # BMEX trading pairs
└── README.md           # This file
```

## Deployment

This project can be deployed on any static hosting service:

- **GitHub Pages**: Automatic deployment from main branch
- **Netlify**: Drag and drop deployment
- **Vercel**: Git integration deployment
- **Local**: Run with any HTTP server

### Local Development

```bash
# Start local server
python3 -m http.server 8000

# Or with Node.js
npx serve .

# Access at http://localhost:8000
```

## License

This project is open source and available under the MIT License.

## Contributing

Feel free to submit issues and enhancement requests! 
