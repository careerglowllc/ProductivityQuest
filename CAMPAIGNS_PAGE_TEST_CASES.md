# Campaigns Page Test Cases

## TC-CAMP-001: Unified Display
**Steps**: Navigate to Campaigns page  
**Expected**: Default and custom campaigns shown together in one section  
**Status**: ✅

## TC-CAMP-002: 5 Campaign Limit (Web)
**Steps**: View campaigns on desktop (non-mobile)  
**Expected**: Maximum 5 campaigns displayed  
**Status**: ✅

## TC-CAMP-003: Unlimited (Mobile)
**Steps**: View campaigns on mobile device  
**Expected**: All campaigns displayed (no 5-limit)  
**Status**: ✅

## TC-CAMP-004: Campaign Counter
**Steps**: View campaigns when 5+ exist  
**Expected**: Header shows "X of Y Campaigns"  
**Status**: ✅

## TC-CAMP-005: Max Reached Message
**Steps**: Have 5+ campaigns on web view  
**Expected**: Message shown: "Showing 5 of X campaigns. View all on mobile."  
**Status**: ✅

## TC-CAMP-006: Mixed Order
**Steps**: Create custom campaigns  
**Expected**: Custom and default campaigns intermixed (not separated)  
**Status**: ✅
