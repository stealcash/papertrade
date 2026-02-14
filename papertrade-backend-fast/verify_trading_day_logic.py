from datetime import date, timedelta

class MarketScheduleMock:
    @classmethod
    def is_market_open(cls, check_date):
        if check_date.weekday() >= 5:
            return False, "Weekend"
        # Mock holiday: 2026-01-26 (Republic Day - Monday)
        if check_date == date(2026, 1, 26):
            return False, "Market Holiday"
        return True, ""

def calculate_actual_entry(target_exp, req_days, mode):
    # 1. Determine Target Entry Day (Skipping Weekends)
    target_day = target_exp
    days_to_subtract = req_days
    while days_to_subtract > 0:
        target_day -= timedelta(days=1)
        if target_day.weekday() < 5:  # Mon-Fri
            days_to_subtract -= 1
    
    # 2. Check if Target Day is a Market Holiday
    is_open, _ = MarketScheduleMock.is_market_open(target_day)
    actual_entry_day = target_day
    
    if not is_open:
        if mode == 'NONE':
            actual_entry_day = None
        elif mode == 'PREVIOUS':
            temp_day = target_day - timedelta(days=1)
            while True:
                o, _ = MarketScheduleMock.is_market_open(temp_day)
                if o:
                    actual_entry_day = temp_day
                    break
                temp_day -= timedelta(days=1)
        elif mode == 'NEXT':
            temp_day = target_day + timedelta(days=1)
            while temp_day <= target_exp:
                o, _ = MarketScheduleMock.is_market_open(temp_day)
                if o:
                    actual_entry_day = temp_day
                    break
                temp_day += timedelta(days=1)
            else:
                actual_entry_day = None
                
    return actual_entry_day

def run_tests():
    # Case 1: Tuesday Expiry, 2 Days Before. Should be Friday.
    # 2026-01-20 (Tue), 01-19 (Mon), 01-18 (Sun-skip), 01-17 (Sat-skip), 01-16 (Fri)
    exp = date(2026, 1, 20)
    res = calculate_actual_entry(exp, 2, 'NONE')
    expected = date(2026, 1, 16)
    print(f"Test 1 (Tue, 2 DTE): Result={res}, Expected={expected}")
    assert res == expected

    # Case 2: Tuesday Expiry, 4 Days Before. (User's example)
    # 2026-01-20 (Tue), Mon(1), skip skip, Fri(2), Thu(3), Wed(4)
    res = calculate_actual_entry(exp, 4, 'NONE')
    expected = date(2026, 1, 14)
    print(f"Test 2 (Tue, 4 DTE): Result={res}, Expected={expected}")
    assert res == expected

    # Case 3: Monday Holiday (2026-01-26 is Holiday). Expiry Tue Jan 27.
    # Expiry 27 (Tue). 1 Day Before = 26 (Mon). Monday is Holiday.
    exp = date(2026, 1, 27)
    
    # Mode NONE
    res = calculate_actual_entry(exp, 1, 'NONE')
    print(f"Test 3 (Mon Holiday, 1 DTE, NONE): Result={res}, Expected=None")
    assert res is None
    
    # Mode PREVIOUS -> Should be Fri Jan 23
    res = calculate_actual_entry(exp, 1, 'PREVIOUS')
    expected = date(2026, 1, 23)
    print(f"Test 4 (Mon Holiday, 1 DTE, PREVIOUS): Result={res}, Expected={expected}")
    assert res == expected

    # Mode NEXT -> Should be Tue Jan 27 (Expiry)
    res = calculate_actual_entry(exp, 1, 'NEXT')
    expected = date(2026, 1, 27)
    print(f"Test 5 (Mon Holiday, 1 DTE, NEXT): Result={res}, Expected={expected}")
    assert res == expected

    print("\nAll tests passed!")

if __name__ == "__main__":
    run_tests()
