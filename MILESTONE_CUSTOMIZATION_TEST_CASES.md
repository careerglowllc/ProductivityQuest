# Customizable Milestones Test Cases

## TC-MILE-001: Open Edit Modal
**Steps**: Open skill milestone modal, click "Customize Milestones"  
**Expected**: EditMilestonesModal opens  
**Status**: ✅

## TC-MILE-002: View Current Milestones
**Steps**: Open edit modal  
**Expected**: Shows all current milestone nodes with fields  
**Status**: ✅

## TC-MILE-003: Add Milestone
**Steps**: Click "Add Milestone" button  
**Expected**: New row added with default values  
**Status**: ✅

## TC-MILE-004: Remove Milestone
**Steps**: Click "Remove" on milestone (when >1 exists)  
**Expected**: Milestone removed from list  
**Status**: ✅

## TC-MILE-005: Edit Title
**Steps**: Change milestone title text  
**Expected**: Title updates in form  
**Status**: ✅

## TC-MILE-006: Edit Level
**Steps**: Change level (1-99)  
**Expected**: Level updates, validation prevents <1 or >99  
**Status**: ✅

## TC-MILE-007: Edit Position
**Steps**: Change X and Y coordinates  
**Expected**: Position updates (X: 10-90%, Y: 5-90%)  
**Status**: ✅

## TC-MILE-008: Save Changes
**Steps**: Modify milestones, click Save  
**Expected**: API called, data saved to DB, modal closes, toast shown  
**Status**: ✅

## TC-MILE-009: Reset Button
**Steps**: Make changes, click Reset  
**Expected**: All changes reverted to original  
**Status**: ✅

## TC-MILE-010: Cancel
**Steps**: Make changes, close modal without saving  
**Expected**: Changes discarded  
**Status**: ✅

## TC-MILE-011: Minimum Milestone
**Steps**: Try to remove last milestone  
**Expected**: Remove button disabled when only 1 remains  
**Status**: ✅

## TC-MILE-012: Persistence
**Steps**: Save custom milestones, refresh page, reopen  
**Expected**: Custom milestones load from database  
**Status**: ✅

## TC-MILE-013: Sorting
**Steps**: Add milestones with random levels, save  
**Expected**: Milestones sorted by level before saving  
**Status**: ✅
