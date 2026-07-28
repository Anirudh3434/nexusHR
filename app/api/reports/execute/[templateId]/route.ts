import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ReportTemplate from '@/models/ReportTemplate';
import ReportExecution from '@/models/ReportExecution';
import { aggregateData, AggregationConfig } from '@/services/reportDataAggregator';
import { headers } from 'next/headers';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    await connectDB();

    const headersList = await headers();
    const companyId = headersList.get('x-company-id');
    const userId = headersList.get('x-user-id');

    if (!companyId || !userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { templateId } = await params;
    const body = await req.json();
    const { parameters = {} } = body;

    // Fetch the template
    const template = await ReportTemplate.findOne({ _id: templateId, companyId });

    if (!template) {
      return NextResponse.json({ message: 'Template not found' }, { status: 404 });
    }

    // Create execution record
    const execution = await ReportExecution.create({
      templateId,
      companyId,
      executedBy: userId,
      parameters,
      status: 'processing',
    });

    // Process report components asynchronously
    processReport(execution._id.toString(), template, parameters, companyId).catch(error => {
      console.error('Error processing report:', error);
    });

    return NextResponse.json({ 
      executionId: execution._id.toString(),
      status: 'processing',
      message: 'Report generation started'
    }, { status: 202 });

  } catch (error: any) {
    console.error('Error executing report:', error);
    return NextResponse.json({ message: 'Error executing report', error: error.message }, { status: 500 });
  }
}

// Async function to process report
async function processReport(
  executionId: string,
  template: any,
  parameters: any,
  companyId: string
) {
  try {
    await connectDB();

    const componentResults: any[] = [];

    // Process each component in the template
    for (const component of template.layout.components) {
      const config = component.config;
      
      // Build aggregation config
      const aggConfig: AggregationConfig = {
        dataSource: config.dataSource,
        aggregation: config.aggregation || 'sum',
        groupBy: config.groupBy,
        filters: applyParameters(config.filters || {}, parameters),
        dateRange: applyDateParameters(config.dateRange, parameters),
      };

      // Aggregate data
      const data = await aggregateData(companyId, aggConfig);
      
      componentResults.push({
        id: component.id,
        type: component.type,
        data,
        config,
      });
    }

    // Update execution with results
    const completedExecution = await ReportExecution.findByIdAndUpdate(
      executionId,
      {
        status: 'completed',
        completedAt: new Date(),
        resultUrl: JSON.stringify(componentResults), // In production, store as file
        resultFormat: 'json',
        recordCount: componentResults.length,
      },
      { new: true }
    );

    // Update template usage stats
    await ReportTemplate.findByIdAndUpdate(template._id, {
      $inc: { viewCount: 1 },
      lastUsed: new Date(),
    });

  } catch (error: any) {
    console.error('Error in processReport:', error);
    
    // Update execution with error
    await ReportExecution.findByIdAndUpdate(
      executionId,
      {
        status: 'failed',
        completedAt: new Date(),
        error: error.message,
      }
    );
  }
}

// Apply parameters to filters
function applyParameters(filters: Record<string, any>, parameters: Record<string, any>): Record<string, any> {
  const result = { ...filters };
  
  for (const [key, value] of Object.entries(parameters)) {
    if (result[key] !== undefined) {
      result[key] = value;
    }
  }
  
  return result;
}

// Apply date parameters to date range
function applyDateParameters(dateRange: any, parameters: Record<string, any>): any {
  if (!dateRange) return undefined;
  
  const result = { ...dateRange };
  
  if (parameters.startDate) {
    result.startDate = new Date(parameters.startDate);
  }
  
  if (parameters.endDate) {
    result.endDate = new Date(parameters.endDate);
  }
  
  return result;
}
