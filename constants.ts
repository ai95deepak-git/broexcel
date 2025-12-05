
import { DataItem, ColumnDef } from './types';

export const SAMPLE_DATA: DataItem[] = [
  { id: '1', Month: 'Jan', Product: 'Laptop', Revenue: 12000, Units: 15, Region: 'North' },
  { id: '2', Month: 'Feb', Product: 'Laptop', Revenue: 15000, Units: 18, Region: 'North' },
  { id: '3', Month: 'Mar', Product: 'Laptop', Revenue: 18000, Units: 22, Region: 'North' },
  { id: '4', Month: 'Jan', Product: 'Chair', Revenue: 8000, Units: 45, Region: 'South' },
  { id: '5', Month: 'Feb', Product: 'Chair', Revenue: 9500, Units: 50, Region: 'South' },
  { id: '6', Month: 'Mar', Product: 'Chair', Revenue: 7200, Units: 38, Region: 'South' },
  { id: '7', Month: 'Jan', Product: 'Desk', Revenue: 5000, Units: 20, Region: 'East' },
  { id: '8', Month: 'Feb', Product: 'Desk', Revenue: 6200, Units: 25, Region: 'East' },
];

export const SAMPLE_COLUMNS: ColumnDef[] = [
    { key: 'Month', label: 'Month', type: 'string' },
    { key: 'Product', label: 'Product', type: 'string' },
    { key: 'Region', label: 'Region', type: 'string' },
    { key: 'Revenue', label: 'Revenue', type: 'number' },
    { key: 'Units', label: 'Units', type: 'number' },
];

export const SAMPLE_REPORT = `
# Operational Performance Review: Q1 Sales

**Prepared by:** BroExcel Analyst
**Date:** ${new Date().toLocaleDateString()}
**To:** Executive Stakeholders

## 1. Executive Summary
This report analyzes sales performance across three key regions to determine revenue drivers. Preliminary findings suggest strong laptop performance in the North, while furniture lines in the East show declining efficiency. The recommendation is to optimize inventory distribution to capitalize on high-margin product demand.

## 2. Introduction
**Background:** This dataset tracks monthly sales performance for Laptops, Chairs, and Desks, including revenue and unit counts.
**Problem Statement:** We are observing significant variance in revenue efficiency between the North and South regions.
**Objective:** The goal of this report is to identify specific product lines driving profitability and propose reallocation of resources.

## 3. Methodology
I analyzed the Q1 sales dataset consisting of 8 key records. I focused on Revenue and Unit volume to calculate revenue per unit efficiency.

## 4. Current State Analysis
**Findings:** 
*   Laptops consistently generate the highest revenue per transaction.
*   The South region moves high volume (Chairs) but at lower margins.
*   Desk sales in the East represent a potential bottleneck.

**Data Evidence:** Laptops generated **$18,000** in March, representing a **20% increase** from January, whereas Chairs averaged only **$8,200** per month despite higher unit volume.

## 5. Recommendations
**Specific Action:** Increase Laptop inventory allocation to the North region by 15%.
**Cost/Benefit:** This adjustment is projected to generate **$25,000** in additional quarterly revenue.
**Timeline:** Immediate implementation for Q2.

## 6. Conclusion
By shifting focus to high-margin electronics in strong markets, we can improve overall profitability while maintaining volume in secondary categories.
`;

export const INITIAL_DATA: DataItem[] = [];
export const INITIAL_COLUMNS: ColumnDef[] = [];
export const INITIAL_REPORT = "";
