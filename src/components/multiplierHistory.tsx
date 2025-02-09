interface MultiplierHistoryProps {
    multiplierHistory: number[]
}

const colors: { [key: number]: string } = {
    20: 'rgb(234, 58, 65)',
    4: 'rgb(240, 87, 92)',
    1.5: 'rgb(230, 70, 60)',
    0.3: 'rgb(237, 107, 65)',
    0.2: 'rgb(245, 195, 67)',
}

export function MultiplierHistory({
    multiplierHistory
}: MultiplierHistoryProps) {
    return (
        <div className="history">
            {multiplierHistory.map((multiplier, index) => {
                if (index > 3 || !multiplier) return null
                return (
                    <div 
                    style={{
                        backgroundColor: colors[multiplier as keyof typeof colors]

                    }}
                    className="history-item" key={`${multiplier}${index}${Math.random()}`}>{multiplier}x</div>
                )
            })}
        </div>
    )
}
