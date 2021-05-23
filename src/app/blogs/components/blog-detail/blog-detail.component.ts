import { Component, ElementRef, OnInit, Renderer2, ViewChild } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { iif, of } from 'rxjs';
import { concatMap, filter, map, tap } from 'rxjs/operators';

import { uuid } from '../../../core/types';
import { BlogsAction, CommentActions } from '../../action.types';
import { selectBlog } from '../../blogs.selector';
import { filterCommentSelector } from '../../comments.selector';
import { Post } from '../../models';
import { BlogService, CommentService } from '../../services';

@Component({
  selector: 'app-blog-detail',
  templateUrl: './blog-detail.component.html',
  styleUrls: ['./blog-detail.component.scss'],
})
export class BlogDetailComponent implements OnInit {
  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly blogService: BlogService,
    private readonly commentService: CommentService,
    private readonly renderer2: Renderer2,
    private readonly store: Store
  ) {
    this.commentControl = new FormControl(null, [Validators.required]);
  }

  private _bgCover!: ElementRef;
  @ViewChild('bgCover')
  set bgCover(value) {
    if (value) {
      this._bgCover = value;
      this.setCoverImage();
    }
  }

  get bgCover() {
    return this._bgCover;
  }

  post: Partial<Post> = {};
  commentControl: FormControl;
  postId: uuid = '';

  ngOnInit(): void {
    this.postId = this.activatedRoute.snapshot.params.id;
    let commentIdList = [];
    this.store
      .select(selectBlog(this.postId))
      .pipe(
        concatMap((post) => {
          if (!post) {
            this.store.dispatch(BlogsAction.loadAllBlogs());
            return this.store.select(selectBlog(this.postId));
          }
          return of(post);
        }),
        filter(post => !!post),
        tap((post) => {
          // creating copy and then assignment as we are mutating this.post object later
          this.post = Object.assign({}, post);
          this.setCoverImage();
          commentIdList = post.comments.map((comment) => comment.id);
          this.store.dispatch(
            CommentActions.getComment({
              commentIdList,
            })
          );
        }),
        concatMap(() =>
          this.store.select(filterCommentSelector(commentIdList))
        )
      )
      .subscribe((comments) => {
          this.post.comments = comments;
      });
  }

  addComment() {
    if (this.commentControl.valid) {
      this.commentService
        .createComment(this.commentControl.value, this.postId, {
          join: [{ field: 'author' }, { field: 'author.avatar' }],
        })
        .subscribe((payload) => {
          this.post.comments?.unshift(payload);
          this.commentControl.reset();
        });
    }
  }

  setCoverImage() {
    if (this.post.image && this.bgCover) {
      this.renderer2.setStyle(
        this.bgCover.nativeElement,
        'background-image',
        this.post.image.base64Url
      );
    }
  }
}
