import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import JobPosition from '@/models/JobPosition';

// GET job positions (public - for careers page)
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const status = searchParams.get('status') || 'Active';
    const isPublic = searchParams.get('public') === 'true';

    const query: any = {};
    
    if (companyId) {
      query.companyId = companyId;
    }
    
    // For public careers page, only show active positions
    if (isPublic) {
      query.status = 'Active';
      query.$or = [
        { closesAt: { $exists: false } },
        { closesAt: { $gte: new Date() } }
      ];
    } else if (status) {
      query.status = status;
    }

    const positions = await JobPosition.find(query)
      .sort({ postedAt: -1 })
      .lean();

    return NextResponse.json(positions);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error fetching positions', error: error.message }, { status: 500 });
  }
}

// POST create new job position (HR/Admin only)
export async function POST(req: Request) {
  try {
    await connectDB();
    const data = await req.json();
    console.log('Creating job position:', data);
    
    // Generate jobId manually if not provided
    if (!data.jobId) {
      try {
        const count = await JobPosition.countDocuments();
        data.jobId = `JB${String(count + 1).padStart(4, '0')}`;
        console.log('Generated jobId:', data.jobId);
      } catch (countError) {
        console.error('Error counting documents:', countError);
        // Fallback: use timestamp
        data.jobId = `JB${Date.now().toString().slice(-4)}`;
      }
    }
    
    const position = await JobPosition.create(data);
    console.log('Created position:', position);
    return NextResponse.json(position, { status: 201 });
  } catch (error: any) {
    console.error('POST job position error:', error);
    return NextResponse.json({ message: 'Error creating position', error: error.message, stack: error.stack }, { status: 500 });
  }
}

// PUT update job position
export async function PUT(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ message: 'ID required' }, { status: 400 });
    }
    
    const data = await req.json();
    const position = await JobPosition.findByIdAndUpdate(id, data, { new: true });
    
    if (!position) {
      return NextResponse.json({ message: 'Position not found' }, { status: 404 });
    }
    
    return NextResponse.json(position);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error updating position', error: error.message }, { status: 500 });
  }
}

// DELETE job position
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ message: 'ID required' }, { status: 400 });
    }
    
    const position = await JobPosition.findByIdAndDelete(id);
    
    if (!position) {
      return NextResponse.json({ message: 'Position not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Position deleted' });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error deleting position', error: error.message }, { status: 500 });
  }
}
